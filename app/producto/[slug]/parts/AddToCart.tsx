"use client";
import { useEffect, useMemo, useState } from 'react';
import { Product, ProductVariant } from '@/types/db';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { ChevronDown } from 'lucide-react';

export function AddToCart({ product, variants }: { product: Product; variants: ProductVariant[] }) {
  const [size, setSize] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useUIStore((s) => s.openCart);

  const selectedVariant = useMemo(() => variants.find((v) => v.size === size) || null, [variants, size]);
  const maxQty = selectedVariant?.stock ?? 0;

  useEffect(() => {
    // Clamp qty when size changes or stock updates
    if (qty > maxQty) setQty(maxQty > 0 ? maxQty : 1);
    if (qty < 1) setQty(1);
  }, [maxQty]);

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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Talle</label>
        <div className="relative mt-1">
          <select
            className="w-full appearance-none rounded border border-neutral-700 bg-neutral-900 px-3 py-2 pr-8 text-sm text-white"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="" disabled>
              Seleccionar talle
            </option>
            {variants.map((v) => (
              <option key={v.id} value={v.size} disabled={v.stock <= 0}>
                {v.size} {v.stock <= 0 ? '(Sin stock)' : `(Stock: ${v.stock})`}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium">Cantidad</label>
        <input
          className="mt-1 w-24 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white"
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
        {size && (
          <div className="mt-1 text-xs text-neutral-400">
            {maxQty > 0 ? `Stock disponible: ${maxQty}` : 'Sin stock para este talle'}
          </div>
        )}
      </div>
      <Button onClick={handleAdd} disabled={!size || maxQty <= 0 || qty < 1 || qty > maxQty} className="w-full">
        Agregar al carrito
      </Button>
    </div>
  );
}


