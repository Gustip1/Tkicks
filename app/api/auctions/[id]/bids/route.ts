import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function service() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const amount = Number(body?.amount);
  const firstName = clean(body?.firstName);
  const lastName = clean(body?.lastName);
  const phone = clean(body?.phone);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
  }
  if (!firstName || !lastName || !phone) {
    return NextResponse.json(
      { error: 'Completá nombre, apellido y teléfono' },
      { status: 400 }
    );
  }
  if (firstName.length > 80 || lastName.length > 80 || phone.length > 30) {
    return NextResponse.json({ error: 'Datos demasiado largos' }, { status: 400 });
  }

  const sb = service();

  // 1. Cargar la subasta
  const { data: auction, error: auctionError } = await sb
    .from('auctions')
    .select(
      'id, status, starting_price, current_price, min_increment, end_at, anti_snipe_window_seconds, anti_snipe_extend_seconds'
    )
    .eq('id', id)
    .single();

  if (auctionError || !auction) {
    console.error('[BIDS POST] auction not found:', id, auctionError);
    return NextResponse.json({ error: 'Subasta no encontrada' }, { status: 404 });
  }

  if (auction.status !== 'active') {
    return NextResponse.json({ error: 'La subasta no está activa' }, { status: 400 });
  }
  if (new Date(auction.end_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'La subasta ya finalizó' }, { status: 400 });
  }

  // 2. Tomar la puja más alta para validar el mínimo + duplicado
  const { data: topBid, error: topErr } = await sb
    .from('bids')
    .select('amount, bidder_phone')
    .eq('auction_id', id)
    .order('amount', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (topErr) {
    console.error('[BIDS POST] top bid query error:', topErr);
    return NextResponse.json(
      { error: 'No se pudo validar la puja', debug: topErr.message },
      { status: 500 }
    );
  }

  const startingPrice = Number(auction.starting_price) || 0;
  const tableCurrent = Number(auction.current_price) || 0;
  const inc = Number(auction.min_increment) || 0;
  // El "actual real" es el max entre lo que dice la tabla y la puja top.
  const effectiveCurrent = Math.max(
    tableCurrent,
    Number(topBid?.amount) || 0,
    startingPrice
  );
  const minRequired = topBid ? effectiveCurrent + inc : startingPrice;

  if (topBid && (topBid as any).bidder_phone && (topBid as any).bidder_phone === phone) {
    return NextResponse.json({ error: 'Ya sos el mejor postor' }, { status: 400 });
  }
  if (amount < minRequired) {
    return NextResponse.json(
      { error: `Mínimo requerido: ${minRequired}` },
      { status: 400 }
    );
  }

  // 3. Insertar la puja
  const { data: inserted, error: insertError } = await sb
    .from('bids')
    .insert({
      auction_id: id,
      amount,
      bidder_first_name: firstName,
      bidder_last_name: lastName,
      bidder_phone: phone,
    })
    .select('id, amount, created_at')
    .single();

  if (insertError || !inserted) {
    console.error('[BIDS POST] insert error:', insertError);
    const msg = insertError?.message || 'No se pudo registrar la puja';
    if (msg.includes('column') && msg.includes('does not exist')) {
      return NextResponse.json(
        {
          error:
            'Faltan columnas en la tabla bids (bidder_first_name/last_name/phone). Aplicá la migración v2 en Supabase.',
          debug: msg,
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'No se pudo registrar la puja', debug: msg }, { status: 400 });
  }

  // 4. Anti-snipe + actualizar precio actual de la subasta
  const remainingSec =
    (new Date(auction.end_at).getTime() - Date.now()) / 1000;
  const antiWin = Number(auction.anti_snipe_window_seconds) || 0;
  const antiExt = Number(auction.anti_snipe_extend_seconds) || 0;
  const newEndAt =
    remainingSec < antiWin && antiExt > 0
      ? new Date(Date.now() + antiExt * 1000).toISOString()
      : auction.end_at;

  const { error: updateError } = await sb
    .from('auctions')
    .update({
      current_price: amount,
      end_at: newEndAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('[BIDS POST] auction update error:', updateError);
    // La puja igual quedó insertada; el GET reconcilia con max(bids.amount).
  }

  console.log('[BIDS POST] ok', {
    auctionId: id,
    bidId: inserted.id,
    amount,
    minWas: minRequired,
    newEndAt,
  });

  return NextResponse.json({
    bidId: inserted.id,
    currentPrice: amount,
    endAt: newEndAt,
  });
}
