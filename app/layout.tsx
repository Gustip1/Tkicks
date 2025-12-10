import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
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
