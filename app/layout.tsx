import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import Script from 'next/script';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { RouteTransitions } from '@/components/RouteTransitions';
import { DolarRateProvider } from '@/components/DolarRateProvider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={cn('min-h-screen bg-black text-white antialiased font-sans font-medium')}>
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
          <img height="1" width="1" style={{display: 'none'}} 
            src="https://www.facebook.com/tr?id=718826237591126&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}
        
        <DolarRateProvider>
          <Header />
          <Sidebar />
          <main className="px-4 py-6 md:px-8 md:py-8 lg:px-12 max-w-[1600px] mx-auto bg-black">
            <RouteTransitions>{children}</RouteTransitions>
          </main>
          <CartDrawer />
        </DolarRateProvider>
      </body>
    </html>
  );
}
