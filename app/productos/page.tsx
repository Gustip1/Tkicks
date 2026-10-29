import { ProductsClient } from '@/components/catalog/ProductsClient';
import { HOODIE_TYPES, StreetWearSubcategory } from '@/types/db';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

export const dynamic = 'force-dynamic';

const validSubcategories = ['remeras', 'hoodies', 'pantalones', 'accesorios'];

export default async function ProductsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const category = typeof searchParams?.sneakers !== 'undefined' ? 'sneakers' : typeof searchParams?.streetwear !== 'undefined' ? 'streetwear' : undefined;
  const subParam = typeof searchParams?.sub === 'string' ? searchParams.sub : undefined;
  const subcategory = subParam && validSubcategories.includes(subParam) ? (subParam as StreetWearSubcategory) : undefined;
  const brand = typeof searchParams?.brand === 'string' ? searchParams.brand : undefined;
  // Tipo dentro de Hoodies / Abrigos: ?sub=hoodies&tipo=sweaters
  const tipoParam = typeof searchParams?.tipo === 'string' ? searchParams.tipo : undefined;
  const tipo = subcategory === 'hoodies' ? HOODIE_TYPES.find((t) => t.value === tipoParam)?.value : undefined;
  return (
    <>
      <div className="flex justify-center py-2">
        <GiveawayInlinePriceClue clueId="/productos" label="Productos" position={1} digit="6" />
      </div>
      <ProductsClient category={category as any} subcategory={subcategory} tipo={tipo} brand={brand} />
    </>
  );
}


