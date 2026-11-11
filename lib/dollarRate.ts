/**
 * Dólar oficial (venta). Lo usan /api/dollar-rate (para mostrar los precios en
 * pesos) y el cobro con tarjeta (para calcular el monto en el servidor, sin
 * confiar en lo que mande el navegador).
 */

export interface DollarRate {
  rate: number;
  source: 'dolarapi.com' | 'bluelytics.com.ar';
  lastUpdate: string;
}

const HEADERS = { Accept: 'application/json', 'User-Agent': 'Tkicks-Ecommerce/1.0' };

/** null si las dos fuentes fallan: quien llama decide qué hacer sin cotización */
export async function fetchOfficialDollarRate(): Promise<DollarRate | null> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      headers: HEADERS,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (typeof data?.venta !== 'number' || data.venta <= 0) throw new Error('Formato inesperado de dolarapi.com');
    return { rate: data.venta, source: 'dolarapi.com', lastUpdate: data.fechaActualizacion ?? new Date().toISOString() };
  } catch (error) {
    console.error('[DOLLAR] dolarapi.com falló:', error);
  }

  try {
    const res = await fetch('https://api.bluelytics.com.ar/v2/latest', {
      headers: HEADERS,
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Bluelytics devuelve otro formato: se usa la venta del oficial
    const rate = data?.oficial?.value_sell || data?.oficial?.value_avg;
    if (typeof rate !== 'number' || rate <= 0) throw new Error('Formato inesperado de bluelytics');
    return { rate, source: 'bluelytics.com.ar', lastUpdate: new Date().toISOString() };
  } catch (error) {
    console.error('[DOLLAR] bluelytics también falló:', error);
  }

  return null;
}
