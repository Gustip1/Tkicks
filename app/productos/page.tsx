import { ProductsClient } from '@/components/catalog/ProductsClient';
import { HOODIE_TYPES, Product, StreetWearSubcategory, subcategoriesOf } from '@/types/db';
import { CARD_COLUMNS, CATALOG_PAGE_SIZE, publicDb } from '@/lib/catalog';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

export const dynamic = 'force-dynamic';
// El stock tiene que ser el real: sin esto Next guarda las respuestas de la base (ver la ficha)
export const fetchCache = 'force-no-store';

const validSubcategories = ['remeras', 'hoodies', 'pantalones', 'accesorios'];

/**
 * La primera tanda de productos llega armada en el HTML. Antes el celular bajaba el JS,
 * pedía los productos a la base (dos veces) y recién ahí dibujaba: unos 6 s con datos móviles.
 */
async function firstPage(category?: string, subs?: StreetWearSubcategory[], brand?: string) {
  let query = publicDb()
    .from('products')
    .select(CARD_COLUMNS, { count: 'exact' })
    .eq('active', true)
    .order('created_at', { ascending: false });
  if (category) query = query.eq('category', category);
  if (subs) query = query.in('subcategory', subs);
  if (brand) query = query.eq('brand', brand);
  const { data, count, error } = await query.range(0, CATALOG_PAGE_SIZE - 1);
  // Si falla, el navegador lo intenta por su cuenta y muestra el estado de carga
  if (error) return null;
  return { products: (data ?? []) as unknown as Product[], hasMore: (count ?? 0) > CATALOG_PAGE_SIZE };
}

export default async function ProductsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const category = typeof searchParams?.sneakers !== 'undefined' ? 'sneakers' : typeof searchParams?.streetwear !== 'undefined' ? 'streetwear' : undefined;
  const subParam = typeof searchParams?.sub === 'string' ? searchParams.sub : undefined;
  const subcategory = subParam && validSubcategories.includes(subParam) ? (subParam as StreetWearSubcategory) : undefined;
  const brand = typeof searchParams?.brand === 'string' ? searchParams.brand : undefined;
  // Tipo dentro de Hoodies / Abrigos: ?sub=hoodies&tipo=sweaters
  const tipoParam = typeof searchParams?.tipo === 'string' ? searchParams.tipo : undefined;
  const tipo = subcategory === 'hoodies' ? HOODIE_TYPES.find((t) => t.value === tipoParam)?.value : undefined;
  // Las búsquedas (?q=) siguen resolviéndose en el navegador
  const subs = tipo ? [tipo] : subcategory ? subcategoriesOf(subcategory) : undefined;
  const first = typeof searchParams?.q === 'string' ? null : await firstPage(category, subs, brand);

  return (
    <>
      <div className="flex justify-center py-2">
        <GiveawayInlinePriceClue clueId="/productos" label="Productos" position={1} digit="6" />
      </div>
      {/* key: cada sección arranca de cero con sus productos */}
      <ProductsClient
        key={[category, subcategory, tipo, brand].join('|')}
        category={category as any}
        subcategory={subcategory}
        tipo={tipo}
        brand={brand}
        initialProducts={first?.products}
        initialHasMore={first?.hasMore}
      />
    </>
  );
}


