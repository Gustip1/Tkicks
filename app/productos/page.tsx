import { ProductsClient } from '@/components/catalog/ProductsClient';
import { StreetWearSubcategory } from '@/types/db';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

export const dynamic = 'force-dynamic';

const validSubcategories = ['remeras', 'hoodies', 'pantalones', 'accesorios'];

export default async function ProductsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const category = typeof searchParams?.sneakers !== 'undefined' ? 'sneakers' : typeof searchParams?.streetwear !== 'undefined' ? 'streetwear' : undefined;
  const subParam = typeof searchParams?.sub === 'string' ? searchParams.sub : undefined;
  const subcategory = subParam && validSubcategories.includes(subParam) ? (subParam as StreetWearSubcategory) : undefined;
  return (
    <>
      <div className="flex justify-center py-2">
        <GiveawayInlinePriceClue clueId="/productos" label="Productos" position={1} digit="6" />
      </div>
      <ProductsClient category={category as any} subcategory={subcategory} />
    </>
  );
}


