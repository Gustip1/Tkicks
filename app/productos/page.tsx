import { createServerSupabase } from '@/lib/supabase/server';
import { ProductsClient } from '@/components/catalog/ProductsClient';

export const dynamic = 'force-dynamic';

export default async function ProductsPage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const supabase = createServerSupabase();
  
  const { data: rateSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'usd_ars_rate')
    .single();
  const usdArsRate = rateSetting ? Number(rateSetting.value) : 1;
  
  const category = typeof searchParams?.sneakers !== 'undefined' ? 'sneakers' : typeof searchParams?.streetwear !== 'undefined' ? 'streetwear' : undefined;
  return <ProductsClient category={category as any} usdArsRate={usdArsRate} />;
}


