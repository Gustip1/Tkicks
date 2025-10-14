import { createServerSupabase } from '@/lib/supabase/server';
import { OfertasClient } from '@/components/catalog/OfertasClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '🔥 Ofertas Especiales | Tkicks',
  description: 'Descubre nuestras ofertas especiales en sneakers y streetwear 100% originales.',
};

export default async function OfertasPage() {
  const supabase = createServerSupabase();
  
  const { data: rateSetting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'usd_ars_rate')
    .single();
  const usdArsRate = rateSetting ? Number(rateSetting.value) : 1;
  
  return <OfertasClient usdArsRate={usdArsRate} />;
}

