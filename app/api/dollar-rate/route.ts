import { NextResponse } from 'next/server';
import { fetchOfficialDollarRate } from '@/lib/dollarRate';

export const dynamic = 'force-dynamic';

// El CDN de Vercel responde la cotización sin pasar por el servidor: antes cada
// visita disparaba una función y un pedido a dolarapi (unos 350 ms) mientras los
// precios en pesos esperaban. El valor por defecto (rate 1000) no se cachea.
const CDN_CACHE = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' };

export async function GET() {
  const now = new Date().toISOString();
  const found = await fetchOfficialDollarRate();

  if (found) {
    return NextResponse.json({ ...found, timestamp: now }, { headers: CDN_CACHE });
  }

  // Último recurso: valor por defecto. Status 200 porque devolvemos un valor válido
  return NextResponse.json({
    rate: 1000,
    source: 'default',
    lastUpdate: now,
    timestamp: now,
    error: 'All external sources failed, using default rate',
  });
}
