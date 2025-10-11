"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cart';
import { useUIStore } from '@/store/ui';
import { formatCurrency } from '@/lib/utils';

export function CartDrawer() {
  const { items, updateQty, removeItem } = useCartStore();
  const subtotal = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const isOpen = useUIStore((s) => s.isCartOpen);
  const close = useUIStore((s) => s.closeCart);

  return (
    <>
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md translate-x-full border-l border-neutral-800 bg-black shadow-xl transition-transform md:w-[420px] ${
          isOpen ? '!translate-x-0' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-neutral-800 p-4">
            <h2 className="text-lg font-semibold text-white">Carrito</h2>
            <button onClick={close} className="rounded-md p-2 text-white hover:bg-neutral-800">
              Cerrar
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {items.length === 0 && <p className="text-sm text-neutral-400">Tu carrito está vacío.</p>}
            {items.map((it) => (
              <div key={`${it.productId}-${it.size}`} className="flex gap-3">
                {it.imageUrl && (
                  <Image
                    src={it.imageUrl}
                    alt={it.title}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/producto/${it.slug}`} className="line-clamp-2 text-sm font-medium text-white">
                    {it.title}
                  </Link>
                  <div className="mt-1 text-xs text-neutral-400">Talle: {it.size}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-white" htmlFor={`qty-${it.productId}-${it.size}`}>
                      Cant.
                    </label>
                    <input
                      id={`qty-${it.productId}-${it.size}`}
                      type="number"
                      min={1}
                      className="h-8 w-16 rounded border border-neutral-600 bg-neutral-800 px-2 text-sm text-white"
                      value={it.quantity}
                      onChange={(e) => updateQty(it.productId, it.size, Number(e.target.value))}
                    />
                    <button
                      className="ml-auto rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      onClick={() => removeItem(it.productId, it.size)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <div className="text-sm font-medium text-white">{formatCurrency(it.price)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-800 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Coordinaremos pago y envío por WhatsApp.
            </p>
            <a
              href={`https://api.whatsapp.com/send?phone=5492644802994&text=${encodeURIComponent(
                `¡Hola! Quisiera comprar los siguientes productos de tu página web:\n\n${items
                  .map((it) => `• ${it.title} - Talle: ${it.size} - Cantidad: ${it.quantity} - ${formatCurrency(it.price * it.quantity)}`)
                  .join('\n')}\n\nSubtotal: ${formatCurrency(subtotal)}\n\nQuedo a la espera para coordinar el pago y el envío. ¡Gracias!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Coordinar por WhatsApp
            </a>
          </div>
        </div>
      </div>
      {isOpen && (
        <button
          aria-label="Cerrar carrito"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/30"
        />
      )}
    </>
  );
}



