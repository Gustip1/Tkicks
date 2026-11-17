import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// La página es del navegador ("use client") y no puede declarar su título: va acá.
export const metadata: Metadata = {
  title: 'Encargos | Tkicks',
  description: 'Pedinos el par o la prenda que buscás: lo traemos original, con seña del 75% y seguimiento por WhatsApp.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
