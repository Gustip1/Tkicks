import './globals.css';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { RouteTransitions } from '@/components/RouteTransitions';
import { DolarRateProvider } from '@/components/DolarRateProvider';

export const metadata: Metadata = {
  title: 'Tkicks',
  description: 'Sneakers & Streetwear - 100% originales',
  openGraph: {
    title: 'Tkicks',
    description: 'Sneakers & Streetwear - 100% originales',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-black text-white antialiased font-bold')}>
        <DolarRateProvider>
          <Header />
          <Sidebar />
          <main className="p-4 md:p-6 lg:p-8">
            <RouteTransitions>{children}</RouteTransitions>
          </main>
          <CartDrawer />
        </DolarRateProvider>
      </body>
    </html>
  );
}


