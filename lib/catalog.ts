import { createClient } from '@supabase/supabase-js';

export const CATALOG_PAGE_SIZE = 60;

/** Lo justo para dibujar una tarjeta: sin descripción ni guía de talles, que pesan y acá no se usan. */
export const CARD_COLUMNS =
  'id,title,slug,category,subcategory,price,sale_price,images,is_new,product_variants(stock,size)';

/** Cliente de solo lectura para armar las páginas en el servidor. */
export function publicDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
}
