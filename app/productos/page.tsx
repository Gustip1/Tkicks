import { ProductsClient } from '@/components/catalog/ProductsClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const category = typeof searchParams?.sneakers !== 'undefined' ? 'sneakers' : typeof searchParams?.streetwear !== 'undefined' ? 'streetwear' : undefined;
  return <ProductsClient category={category as any} />;
}


