"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product, ProductVariant } from '@/types/db';

export default function AdminStockPage() {
  const supabase = createBrowserClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('id, title')
      .order('title', { ascending: true })
      .then(({ data }) => setProducts((data || []) as any));
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', selected)
      .order('size', { ascending: true })
      .then(({ data }) => setVariants((data || []) as any));
  }, [selected]);

  const save = async () => {
    setMessage(null);
    if (!selected) return;
    const { error } = await supabase.from('product_variants').upsert(
      variants.map((v) => ({ id: v.id, product_id: selected, size: v.size, stock: v.stock }))
    );
    if (error) setMessage(error.message);
    else setMessage('Stock actualizado');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Stock por talles</h1>
      <div className="max-w-xl">
        <label className="block text-sm font-medium text-white">Producto</label>
        <select className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Seleccionar...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
      {selected && (
        <div className="max-w-xl space-y-2">
          <div className="grid grid-cols-[1fr_120px] items-center gap-2 text-xs font-medium text-neutral-300">
            <div>Talle</div>
            <div>Stock</div>
          </div>
          {variants.map((v, idx) => (
            <div key={v.id || idx} className="grid grid-cols-[1fr_120px] items-center gap-2">
              <input
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white placeholder-neutral-400"
                value={v.size}
                onChange={(e) => {
                  const next = [...variants];
                  next[idx] = { ...next[idx], size: e.target.value };
                  setVariants(next);
                }}
              />
              <input
                type="number"
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-white"
                min={0}
                value={v.stock}
                onChange={(e) => {
                  const next = [...variants];
                  next[idx] = { ...next[idx], stock: Number(e.target.value) };
                  setVariants(next);
                }}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-neutral-800 px-3 py-2 text-xs text-white"
              onClick={() => setVariants([...variants, { id: crypto.randomUUID(), product_id: selected, size: '', stock: 0 }])}
            >
              Agregar fila
            </button>
            <button onClick={save} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
              Guardar
            </button>
            {message && <span className="text-sm">{message}</span>}
          </div>
        </div>
      )}
    </div>
  );
}


