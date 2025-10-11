"use client";
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string>('');
  const [onlyActive, setOnlyActive] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => setProducts((data || []) as unknown as Product[]));
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q.toLowerCase())) return false;
      if (category && p.category !== category) return false;
      if (onlyActive && !p.active) return false;
      return true;
    });
  }, [products, q, category, onlyActive]);

  return (
    <div className="space-y-4 text-black">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <Link href="/admin/productos/nuevo" className="rounded bg-black px-3 py-2 text-sm font-medium text-white">
          Nuevo producto
        </Link>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-black">Buscar</label>
          <input className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-black">Categoría</label>
          <select className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            <option value="sneakers">Sneakers</option>
            <option value="streetwear">Streetwear</option>
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-black">
          <input className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} /> Activos
        </label>
      </div>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full text-left text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Act.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destacados</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.title}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{Number(p.price).toLocaleString('es-AR')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.active ? 'Sí' : 'No'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.featured_sneakers || p.featured_streetwear ? 'Sí' : '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link href={`/admin/productos/${p.id}`} className="text-blue-600 hover:text-blue-900">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


