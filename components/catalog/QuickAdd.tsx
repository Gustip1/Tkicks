"use client";
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Product } from '@/types/db';
import { Sheet, SheetHandleArea } from '@/components/ui/Sheet';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { trackEvent } from '@/lib/analytics/track';
import { haptic } from '@/lib/haptics';

/**
 * Agregar al carrito desde la tarjeta, sin entrar a la ficha.
 *
 * Con un solo talle disponible (casi todo el catálogo es última unidad) es un
 * toque. Con varios, abre una hoja para elegirlo.
 */
export function QuickAdd({ product, price }: { product: Product; price: number }) {
  const [open, setOpen] = useState(false);
  // La hoja se monta recién la primera vez que hace falta
  const [everOpened, setEverOpened] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUIStore((s) => s.openCart);

  const variants = (product.product_variants ?? []).filter((v) => (v.stock ?? 0) > 0 && v.size);
  if (variants.length === 0) return null;

  const add = (size: string) => {
    const stock = variants.find((v) => v.size === size)?.stock ?? 0;
    const inCart = useCartStore.getState().items.find((it) => it.productId === product.id && it.size === size)?.quantity ?? 0;
    // Si ya tiene en el carrito todo lo que hay de ese talle, solo se le muestra
    if (inCart < stock) {
      addItem(
        { productId: product.id, slug: product.slug, title: product.title, price, imageUrl: product.images?.[0]?.url ?? null, size },
        1
      );
      trackEvent('add_to_cart', 'ecommerce', { slug: product.slug, title: product.title, size, quantity: 1, price, source: 'card' });
    }
    haptic();
    setOpen(false);
    openCart();
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Agregar ${product.title} al carrito`}
        aria-haspopup={variants.length > 1 ? 'dialog' : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (variants.length === 1) return add(variants[0].size as string);
          setEverOpened(true);
          setOpen(true);
        }}
        className="card-action"
      >
        <Plus className="h-5 w-5" strokeWidth={2} aria-hidden />
      </button>

      {everOpened && (
        <Sheet open={open} onClose={() => setOpen(false)} labelledBy={`qa-${product.id}`}>
          <SheetHandleArea className="px-6 pt-4 sm:px-8 sm:pt-8">
            <h2 id={`qa-${product.id}`} className="pr-10 text-[22px] sm:text-[26px] font-semibold leading-tight tracking-[-0.015em]">
              Elegí tu talle
            </h2>
            <p className="mt-1.5 truncate text-[15px] text-gray-500">{product.title}</p>
          </SheetHandleArea>
          <div className="grid grid-cols-4 gap-2 px-6 pb-4 pt-5 sm:px-8 sm:pb-8">
            {variants.map((v) => (
              <button
                key={v.size}
                type="button"
                onClick={() => add(v.size as string)}
                className="min-h-[48px] rounded-[12px] border border-gray-200 bg-white px-2 text-[15px] text-gray-900 transition-[transform,border-color] duration-150 active:scale-[0.97] hover:border-gray-400"
              >
                {v.size}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
