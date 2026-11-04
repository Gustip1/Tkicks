import { OfertasClient } from '@/components/catalog/OfertasClient';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';
import { CARD_COLUMNS, publicDb } from '@/lib/catalog';
import { Product } from '@/types/db';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata = {
  title: 'Ofertas | Tkicks',
  description: 'Descubre nuestras ofertas especiales en sneakers y streetwear 100% originales.',
};

export default async function OfertasPage() {
  const { data } = await publicDb()
    .from('products')
    .select(CARD_COLUMNS)
    .eq('on_sale', true)
    .eq('active', true)
    .order('created_at', { ascending: false });

  return (
    <>
      {/* La franja negra va pegada al menú; la pista del sorteo queda debajo */}
      <OfertasClient products={(data ?? []) as unknown as Product[]} />
      <div className="flex justify-center py-2">
        <GiveawayInlinePriceClue clueId="/ofertas" label="Ofertas" position={2} digit="0" />
      </div>
    </>
  );
}

