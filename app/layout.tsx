import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { RouteTransitions } from '@/components/RouteTransitions';
import { DolarRateProvider } from '@/components/DolarRateProvider';
import { InstallmentsPromoProvider } from '@/components/InstallmentsPromoProvider';
import { ComingSoonProvider } from '@/components/ComingSoonProvider';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { GiveawayClue } from '@/components/giveaway/GiveawayClue';
import { PromoModal } from '@/components/promo/PromoModal';
import { RecentSaleToast } from '@/components/ui/RecentSaleToast';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { HideOnAdmin } from '@/components/layout/HideOnAdmin';

// Auto-hospedadas por Next (sin @import ni round-trip a fonts.googleapis.com,
// que antes bloqueaba el render ~500-600ms en cada carga).
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#008060'
};

export const metadata: Metadata = {
  title: 'Tkicks - Sneakers & Streetwear',
  description: 'Tu destino exclusivo para Sneakers y Streetwear 100% originales en San Juan, Argentina.',
  keywords: ['sneakers', 'streetwear', 'zapatillas', 'ropa urbana', 'original', 'san juan'],
  openGraph: {
    title: 'Tkicks - Sneakers & Streetwear',
    description: 'Tu destino exclusivo para Sneakers y Streetwear 100% originales',
    type: 'website',
    locale: 'es_AR'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={cn(dmSans.variable, playfairDisplay.variable)}>
      <body className={cn('min-h-screen bg-white text-gray-900 antialiased font-sans font-medium')}>
        {/* Meta Pixel Code */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '718826237591126');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{display: 'none'}} alt=""
            src="https://www.facebook.com/tr?id=718826237591126&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}
        
        <DolarRateProvider>
          <InstallmentsPromoProvider>
            <ComingSoonProvider>
            <AnalyticsProvider>
              <Header />
              <Sidebar />
              <main className="px-2 py-3 md:px-8 md:py-8 lg:px-12 max-w-[1600px] mx-auto bg-white overflow-x-hidden">
                <RouteTransitions>{children}</RouteTransitions>
                <GiveawayClue />
              </main>
              <HideOnAdmin>
                <Footer />
                <CartDrawer />
                <PromoModal />
                <RecentSaleToast />
              </HideOnAdmin>
              <WhatsAppFab />
            </AnalyticsProvider>
            </ComingSoonProvider>
          </InstallmentsPromoProvider>
        </DolarRateProvider>
      </body>
    </html>
  );
}
