/**
 * Crea la miniatura (sm/, 640px) de las fotos de producto ya cargadas. Las
 * fotos nuevas la reciben al subirse (app/api/upload); esto cubre las de antes.
 * Ver lib/images/thumbs.ts.
 *
 * Uso:
 *   node scripts/crear-miniaturas.cjs            → simulacro, no sube nada
 *   node scripts/crear-miniaturas.cjs --aplicar  → sube las que faltan
 *
 * Solo procesa las fotos que se usan (productos, categorías de la home y
 * subastas); el bucket tiene cientos de archivos viejos que ya no se muestran.
 * No toca ni borra las originales y se puede correr de nuevo: saltea las que
 * ya tienen miniatura.
 */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Igual que lib/images/thumbs.ts
const SIZE = 640;
const QUALITY = 80;
const FOLDER = 'sm';
const PUBLIC_PATH = '/storage/v1/object/public/product-images/';
const APLICAR = process.argv.includes('--aplicar');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bucket = sb.storage.from('product-images');

const kb = (n) => Math.round(n / 1024) + 'KB';

/** Nombres de archivo del bucket que aparecen en cualquier parte de las filas. */
function nombresUsados(filas) {
  const nombres = new Set();
  const texto = JSON.stringify(filas);
  const re = new RegExp(PUBLIC_PATH.replace(/\//g, '\\/') + '([^"\\\\/?]+)', 'g');
  for (const m of texto.matchAll(re)) nombres.add(decodeURIComponent(m[1]));
  return nombres;
}

async function listar(carpeta) {
  const nombres = new Set();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(carpeta, { limit: 1000, offset });
    if (error) throw new Error(error.message);
    data.filter(f => f.id).forEach(f => nombres.add(f.name));
    if (data.length < 1000) return nombres;
  }
}

(async () => {
  const filas = [];
  for (const [tabla, columnas] of [['products', 'images'], ['settings', 'value'], ['auctions', 'product_image']]) {
    const { data, error } = await sb.from(tabla).select(columnas);
    if (error) console.log(`  ! no se pudo leer ${tabla}: ${error.message}`);
    else filas.push(...data);
  }

  const usadas = nombresUsados(filas);
  const conMiniatura = await listar(FOLDER);
  const faltan = [...usadas].filter(n => !conMiniatura.has(n));

  console.log(APLICAR ? '>>> APLICANDO CAMBIOS\n' : '>>> SIMULACRO (no se sube nada). Usá --aplicar para aplicar.\n');
  console.log(`Fotos en uso: ${usadas.size} · ya tienen miniatura: ${usadas.size - faltan.length} · faltan: ${faltan.length}\n`);

  let hechas = 0, fallidas = 0, pesoAntes = 0, pesoDespues = 0;

  for (const nombre of faltan) {
    try {
      const { data: original, error } = await bucket.download(nombre);
      if (error) throw new Error(error.message);
      const buf = Buffer.from(await original.arrayBuffer());

      const out = await sharp(buf).rotate()
        .resize(SIZE, SIZE, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .webp({ quality: QUALITY, effort: 4 })
        .toBuffer();

      if (APLICAR) {
        const { error: upErr } = await bucket.upload(`${FOLDER}/${nombre}`, out, {
          contentType: 'image/webp', cacheControl: '31536000', upsert: false,
        });
        if (upErr) throw new Error(upErr.message);
      }

      pesoAntes += buf.length; pesoDespues += out.length; hechas++;
      console.log(`  ${kb(buf.length).padStart(7)} → ${kb(out.length).padStart(6)}  ${nombre}`);
    } catch (e) {
      fallidas++;
      console.log(`  ! ${nombre}: ${e.message}`);
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(APLICAR ? 'Miniaturas subidas :' : 'Miniaturas a crear :', hechas);
  console.log('Con problemas      :', fallidas);
  if (pesoAntes) console.log(`Peso por foto      : ${kb(pesoAntes / hechas)} → ${kb(pesoDespues / hechas)} en promedio`);
  if (!APLICAR) console.log('\nSimulacro terminado. Para aplicarlo: node scripts/crear-miniaturas.cjs --aplicar');
  if (fallidas) process.exitCode = 1;
})();
