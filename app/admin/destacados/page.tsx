"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';

export default function AdminFeaturedPage() {
  const supabase = createBrowserClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setProducts((data || []) as any));
  }, []);

  const toggle = async (id: string, key: 'featured_sneakers' | 'featured_streetwear', value: boolean) => {
    setMessage(null);
    const { error } = await supabase.from('products').update({ [key]: value }).eq('id', id);
    if (error) setMessage(error.message);
    else setMessage('Actualizado');
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } as any : p)));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Destacados</h1>
      {message && <p className="text-sm text-black">{message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-neutral-700">
              <th className="p-2">Título</th>
              <th className="p-2">Categoría</th>
              <th className="p-2">Sneakers</th>
              <th className="p-2">Streetwear</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2 text-black">{p.title}</td>
                <td className="p-2 text-black">{p.category}</td>
                <td className="p-2">
                  <input type="checkbox" checked={p.featured_sneakers} onChange={(e) => toggle(p.id, 'featured_sneakers', e.target.checked)} />
                </td>
                <td className="p-2">
                  <input type="checkbox" checked={p.featured_streetwear} onChange={(e) => toggle(p.id, 'featured_streetwear', e.target.checked)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


