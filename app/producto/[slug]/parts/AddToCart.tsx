"use client";
import { useEffect, useMemo, useState } from 'react';
import { Product, ProductVariant } from '@/types/db';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';

export function AddToCart({ product, variants }: { product: Product; variants: ProductVariant[] }) {
  const [size, setSize] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUIStore((s) => s.openCart);

  const selectedVariant = useMemo(() => variants.find((v) => v.size === size) || null, [variants, size]);
  const maxQty = selectedVariant?.stock ?? 0;

  useEffect(() => {
    // Clamp qty cuando cambia el talle o el stock disponible
    if (qty > maxQty) setQty(maxQty > 0 ? maxQty : 1);
    if (qty < 1) setQty(1);
  }, [maxQty, qty]);

  const handleAdd = () => {
    if (!size) return;
    if (maxQty <= 0) return;
    const finalQty = Math.max(1, Math.min(qty, maxQty));
    const imageUrl = product.images?.[0]?.url ?? null;
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        price: Number(product.price),
        imageUrl,
        size
      },
      finalQty
    );
    openCart();
  };

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Selector de talla */}
      <div>
        <label className="block text-xs md:text-sm font-black text-white mb-2 md:mb-3 uppercase tracking-wider">
          Selecciona tu talla
        </label>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-1.5 md:gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSize(size === v.size ? '' : v.size)}
              disabled={v.stock <= 0}
              className={`
                relative py-2.5 md:py-3 px-1.5 md:px-2 rounded-md md:rounded-lg border-2 text-xs md:text-sm font-black transition-all
                ${size === v.size 
                  ? 'border-white bg-white text-black' 
                  : v.stock > 0
                    ? 'border-zinc-700 bg-zinc-900 text-white hover:border-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-600 cursor-not-allowed'
                }
              `}
            >
              {v.size}
              {v.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-0.5 bg-zinc-600 rotate-45" />
                </div>
              )}
            </button>
          ))}
        </div>
        {size && selectedVariant && (
          <p className="mt-2 text-xs text-gray-400 font-bold">
            {maxQty > 0 ? `${maxQty} unidades disponibles` : 'Sin stock'}
          </p>
        )}
      </div>

      {/* Selector de cantidad */}
      <div>
        <label className="block text-xs md:text-sm font-black text-white mb-2 md:mb-3 uppercase tracking-wider">
          Cantidad
        </label>
        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
            disabled={!size || maxQty <= 0 || qty <= 1}
            className="w-9 h-9 md:w-10 md:h-10 rounded-md md:rounded-lg border-2 border-zinc-700 flex items-center justify-center text-white font-black hover:border-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-base md:text-lg">−</span>
          </button>
          <input
            className="w-14 md:w-16 h-9 md:h-10 text-center rounded-md md:rounded-lg border-2 border-zinc-700 bg-black text-white text-sm md:text-base font-black focus:outline-none focus:border-white"
            type="number"
            min={1}
            max={maxQty > 0 ? maxQty : undefined}
            value={qty}
            disabled={!size || maxQty <= 0}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isNaN(next)) return;
              setQty(Math.max(1, Math.min(next, maxQty || 1)));
            }}
          />
          <button
            type="button"
            onClick={() => setQty(Math.min(maxQty, qty + 1))}
            disabled={!size || maxQty <= 0 || qty >= maxQty}
            className="w-9 h-9 md:w-10 md:h-10 rounded-md md:rounded-lg border-2 border-zinc-700 flex items-center justify-center text-white font-black hover:border-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span className="text-base md:text-lg">+</span>
          </button>
        </div>
      </div>

      {/* Botón de agregar al carrito */}
      <Button 
        onClick={handleAdd} 
        disabled={!size || maxQty <= 0 || qty < 1 || qty > maxQty} 
        className="btn-primary w-full py-3 md:py-4 text-sm md:text-base font-black tracking-wide uppercase shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!size ? 'Selecciona una talla' : maxQty <= 0 ? 'Sin stock' : 'Agregar al carrito'}
      </Button>

      {/* Información adicional - SIN MENCIONAR CAMBIOS/DEVOLUCIONES */}
      <div className="pt-3 md:pt-4 space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-300 border-t border-zinc-800">
        <p className="flex items-center gap-2 font-bold">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Envío gratis en compras mayores a $50
        </p>
        <p className="flex items-center gap-2 font-bold">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Producto 100% original garantizado
        </p>
      </div>
    </div>
  );
}


