import { OfertasClient } from '@/components/catalog/OfertasClient';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '🔥 Ofertas Especiales | Tkicks',
  description: 'Descubre nuestras ofertas especiales en sneakers y streetwear 100% originales.',
};

export default async function OfertasPage() {
  return (
    <>
      <div className="flex justify-center py-2">
        <GiveawayInlinePriceClue clueId="/ofertas" label="Ofertas" position={2} digit="0" />
      </div>
      <OfertasClient />
    </>
  );
}

