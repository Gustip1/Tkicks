import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// La página es del navegador ("use client") y no puede declarar su título: va acá.
export const metadata: Metadata = {
  title: 'Subastas | Tkicks',
  description: 'Subastas de sneakers y streetwear originales en Tkicks.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
