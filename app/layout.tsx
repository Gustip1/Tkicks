import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
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
import { AccountNoticeProvider } from '@/components/announcement/AccountNoticeProvider';
import { AccountNoticeModal } from '@/components/announcement/AccountNoticeModal';
import { RecentSaleToast } from '@/components/ui/RecentSaleToast';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { HideOnAdmin } from '@/components/layout/HideOnAdmin';
import { RevealObserver } from '@/components/RevealObserver';
import { TouchFeedback } from '@/components/TouchFeedback';

// Auto-hospedadas por Next (sin @import ni round-trip a fonts.googleapis.com,
// que antes bloqueaba el render ~500-600ms en cada carga).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Negro, como la navegación: en iPhone la barra de estado se funde con el menú
  themeColor: '#000000',
  interactiveWidget: 'resizes-content'
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
    <html lang="es" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-white text-gray-900 antialiased font-sans font-normal')}>
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
          <AccountNoticeProvider>
          <InstallmentsPromoProvider>
            <ComingSoonProvider>
            <AnalyticsProvider>
              {/* Para quien navega con teclado: saltea el menú y va directo al contenido */}
              <a
                href="#contenido"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-[15px] focus:text-gray-900 focus:shadow-lg"
              >
                Saltar al contenido
              </a>
              <Header />
              <Sidebar />
              <main id="contenido" tabIndex={-1} className="outline-none px-2 py-3 md:px-8 md:py-8 lg:px-12 max-w-[1600px] mx-auto bg-white">
                <RouteTransitions>{children}</RouteTransitions>
                <GiveawayClue />
              </main>
              <HideOnAdmin>
                <Footer />
                <CartDrawer />
                <AccountNoticeModal />
                <PromoModal />
                <RecentSaleToast />
              </HideOnAdmin>
              <WhatsAppFab />
              <RevealObserver />
              <TouchFeedback />
            </AnalyticsProvider>
            </ComingSoonProvider>
          </InstallmentsPromoProvider>
          </AccountNoticeProvider>
        </DolarRateProvider>
      </body>
    </html>
  );
}
