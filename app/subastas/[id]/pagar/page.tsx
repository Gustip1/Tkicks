"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, AlertCircle, Truck, Store } from 'lucide-react';
import { formatARS } from '@/lib/utils';
import { createBrowserClient } from '@/lib/supabase/client';

interface AuctionMin {
  id: string;
  status: string;
  current_price: number;
  winner_user_id: string | null;
  winner_order_id: string | null;
  product: { title: string };
  variant: { size: string };
}

export default function PagarSubastaPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [auction, setAuction] = useState<AuctionMin | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofDone, setProofDone] = useState(false);

  const [fulfillment, setFulfillment] = useState<'pickup' | 'shipping'>('pickup');
  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '', phone: '', document: '' });
  const [address, setAddress] = useState({ street: '', number: '', unit: '', city: '', province: '', postalCode: '', notes: '' });

  useEffect(() => {
    let cancel = false;
    (async () => {
      const sb = createBrowserClient();
      const { data: u } = await sb.auth.getUser();
      if (cancel) return;
      setUser(u.user);
      if (!u.user) { setLoading(false); return; }

      const res = await fetch(`/api/auctions/${params.id}`, { cache: 'no-store' });
      const data = await res.json();
      if (cancel) return;
      if (!res.ok) { setErr(data?.error || 'Error'); setLoading(false); return; }
      setAuction(data.auction);
      if (u.user.email) setContact((c) => ({ ...c, email: u.user!.email! }));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-black text-white p-8">Cargando…</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <p>Tenés que iniciar sesión.</p>
        <Link href={`/login?redirect=/subastas/${params.id}/pagar`} className="text-orange-400 underline">Iniciar sesión</Link>
      </div>
    );
  }
  if (err || !auction) {
    return <div className="min-h-screen bg-black text-white p-8 text-red-400">{err || 'Subasta no encontrada'}</div>;
  }
  if (auction.status === 'paid' && auction.winner_order_id) {
    return (
      <div className="min-h-screen bg-black text-white p-8 space-y-3">
        <p>Esta subasta ya tiene una orden creada.</p>
        <Link href="/account" className="text-orange-400 underline">Ver mis órdenes</Link>
      </div>
    );
  }
  if (auction.status !== 'ended' || auction.winner_user_id !== user.id) {
    return (
      <div className="min-h-screen bg-black text-white p-8 space-y-3">
        <p>No sos el ganador de esta subasta o todavía no terminó.</p>
        <Link href={`/subastas/${params.id}`} className="text-orange-400 underline">Volver</Link>
      </div>
    );
  }

  const submit = async () => {
    setErr(null);
    if (!contact.firstName.trim() || !contact.email.trim()) {
      setErr('Nombre y email son obligatorios.');
      return;
    }
    if (fulfillment === 'shipping') {
      if (!address.street.trim() || !address.postalCode.trim()) {
        setErr('Dirección y código postal son obligatorios para envío.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/auctions/${params.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfillment,
          contact,
          address: fulfillment === 'shipping' ? address : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error');
      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber || data.orderId.slice(0, 8));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadProof = async () => {
    if (!proofFile || !orderId) return;
    setProofUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      fd.append('order_id', orderId);
      const res = await fetch('/api/upload-proof', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Error subiendo comprobante');
      setProofDone(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setProofUploading(false);
    }
  };

  if (orderId && proofDone) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-black px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-black text-white">¡Comprobante recibido!</h1>
          <p className="text-zinc-400 text-sm">
            Orden <span className="text-white font-bold">{orderNumber}</span>. Te contactaremos cuando lo validemos.
          </p>
          <button onClick={() => router.push('/')} className="bg-white text-black font-black uppercase px-5 py-3 rounded-lg">
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white py-8">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <h1 className="text-2xl font-black uppercase">Pago de subasta</h1>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-2">
          <p className="text-sm text-zinc-400">Producto</p>
          <p className="font-bold">{auction.product.title} · Talle {auction.variant.size}</p>
          <p className="text-sm text-zinc-400 mt-3">Total a transferir</p>
          <p className="text-3xl font-black">{formatARS(Number(auction.current_price))}</p>
        </div>

        {!orderId && (
          <>
            {/* Fulfillment */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <p className="text-sm uppercase font-bold text-zinc-400">Entrega</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillment('pickup')}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 ${fulfillment === 'pickup' ? 'border-white bg-white/5' : 'border-zinc-800 hover:border-zinc-600'}`}
                >
                  <Store className="w-5 h-5" />
                  <span className="text-sm font-bold">Retiro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillment('shipping')}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 ${fulfillment === 'shipping' ? 'border-white bg-white/5' : 'border-zinc-800 hover:border-zinc-600'}`}
                >
                  <Truck className="w-5 h-5" />
                  <span className="text-sm font-bold">Envío</span>
                </button>
              </div>
            </div>

            {/* Contacto */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <p className="text-sm uppercase font-bold text-zinc-400">Tus datos</p>
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="Nombre *" value={contact.firstName} onChange={(e) => setContact({ ...contact, firstName: e.target.value })} />
                <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="Apellido" value={contact.lastName} onChange={(e) => setContact({ ...contact, lastName: e.target.value })} />
                <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm col-span-2" placeholder="Email *" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="Teléfono" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="DNI" value={contact.document} onChange={(e) => setContact({ ...contact, document: e.target.value })} />
              </div>
            </div>

            {/* Dirección si shipping */}
            {fulfillment === 'shipping' && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                <p className="text-sm uppercase font-bold text-zinc-400">Dirección</p>
                <div className="grid grid-cols-3 gap-3">
                  <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm col-span-2" placeholder="Calle *" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                  <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="Nº" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                  <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="Depto" value={address.unit} onChange={(e) => setAddress({ ...address, unit: e.target.value })} />
                  <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="Ciudad" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                  <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm" placeholder="Provincia" value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })} />
                  <input className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm col-span-3" placeholder="CP *" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value })} />
                  <textarea className="rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm col-span-3" rows={2} placeholder="Notas" value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} />
                </div>
              </div>
            )}

            {err && <p className="text-red-400 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {err}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-orange-500 text-black font-black uppercase py-3 rounded-lg hover:bg-orange-400 disabled:opacity-50"
            >
              {submitting ? 'Procesando…' : 'Continuar'}
            </button>
          </>
        )}

        {/* Paso 2: subir comprobante */}
        {orderId && !proofDone && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div>
              <p className="text-sm uppercase font-bold text-zinc-400">Datos para transferir</p>
              <p className="text-sm text-zinc-300 mt-2">Alias: <span className="font-bold text-white">gus.p21</span></p>
              <p className="text-sm text-zinc-300">Total: <span className="font-bold text-white">{formatARS(Number(auction.current_price))}</span></p>
              <p className="text-xs text-zinc-500 mt-2">Orden: {orderNumber}</p>
            </div>

            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <p className="text-sm uppercase font-bold text-zinc-400">Subí el comprobante</p>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-zinc-300"
              />
              {err && <p className="text-red-400 text-sm">{err}</p>}
              <button
                onClick={uploadProof}
                disabled={!proofFile || proofUploading}
                className="w-full bg-orange-500 text-black font-black uppercase py-3 rounded-lg hover:bg-orange-400 disabled:opacity-50"
              >
                {proofUploading ? 'Subiendo…' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
