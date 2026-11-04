import type { MetadataRoute } from 'next';
import { createServerSupabase } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from('products').select('slug').eq('active', true).limit(500);
  const base = SITE_URL;
  const items = (data || []).map((p) => ({ url: `${base}/producto/${p.slug}` }));
  return [
    { url: `${base}/` },
    { url: `${base}/productos?sneakers` },
    { url: `${base}/productos?streetwear` },
    { url: `${base}/encargos` },
    { url: `${base}/nosotros` },
    { url: `${base}/sorteo` },
    ...items
  ];
}


