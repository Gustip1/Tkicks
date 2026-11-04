import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// El CDN de Vercel responde la cotización sin pasar por el servidor: antes cada
// visita disparaba una función y un pedido a dolarapi (unos 350 ms) mientras los
// precios en pesos esperaban. El valor por defecto (rate 1000) no se cachea.
const CDN_CACHE = { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' };

interface DollarApiResponse {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export async function GET(_req: NextRequest) {
  try {
    console.log('[DOLLAR API] Fetching from external API...');
    
    // Intentar con dolarapi.com primero
    const response = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Tkicks-Ecommerce/1.0'
      },
      // Timeout de 5 segundos
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: DollarApiResponse = await response.json();
    
    if (!data?.venta || typeof data.venta !== 'number') {
      throw new Error('Invalid response format from dolarapi.com');
    }

    console.log('[DOLLAR API] Success:', data.venta);
    
    return NextResponse.json({
      rate: data.venta,
      source: 'dolarapi.com',
      lastUpdate: data.fechaActualizacion,
      timestamp: new Date().toISOString()
    }, { headers: CDN_CACHE });

  } catch (error) {
    console.error('[DOLLAR API] Primary source failed:', error);
    
    try {
      // Backup: API alternativa
      console.log('[DOLLAR API] Trying backup source...');
      
      const backupResponse = await fetch('https://api.bluelytics.com.ar/v2/latest', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Tkicks-Ecommerce/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (backupResponse.ok) {
        const backupData = await backupResponse.json();
        
        // Bluelytics devuelve un formato diferente — usamos el precio de venta del oficial
        const officialRate = backupData?.oficial?.value_sell || backupData?.oficial?.value_avg;

        if (officialRate && typeof officialRate === 'number') {
          console.log('[DOLLAR API] Backup success:', officialRate);

          return NextResponse.json({
            rate: officialRate,
            source: 'bluelytics.com.ar',
            lastUpdate: new Date().toISOString(),
            timestamp: new Date().toISOString()
          }, { headers: CDN_CACHE });
        }
      }
      
      throw new Error('Backup API also failed');
      
    } catch (backupError) {
      console.error('[DOLLAR API] Backup source also failed:', backupError);
      
      // Último recurso: valor por defecto
      return NextResponse.json({
        rate: 1000, // Valor por defecto
        source: 'default',
        lastUpdate: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        error: 'All external sources failed, using default rate'
      }, { status: 200 }); // Status 200 porque devolvemos un valor válido
    }
  }
}
