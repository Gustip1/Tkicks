"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product } from '@/types/db';
import { revalidateHome } from '@/lib/admin/revalidateHome';

/**
 * Próximos ingresos: productos en camino al showroom que todavía no llegaron.
 * Marcar un producto acá le pone la etiqueta "🚚 En camino" sobre la foto en
 * todo el sitio y el aviso de compra anticipada en su página. Se guarda en
 * settings (key "coming_soon") — no usa ninguna columna nueva, así que no
 * requiere migración.
 */
type ComingSoonConfig = { ids: string[] };

export default function AdminProximosPage() {
  const supabase = createBrowserClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<ComingSoonConfig>({ ids: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      const [{ data: productsData }, { data: settingRow }] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('settings').select('value').eq('key', 'coming_soon').maybeSingle(),
      ]);
      setProducts((productsData || []) as any);
      const raw = settingRow?.value as Partial<ComingSoonConfig> | undefined;
      setConfig({
        ids: Array.isArray(raw?.ids) ? raw!.ids.filter((x): x is string => typeof x === 'string') : [],
      });
      setLoading(false);
    })();
  }, [supabase]);

  const persist = async (next: ComingSoonConfig) => {
    setMessage(null);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'coming_soon', value: next }, { onConflict: 'key' });
    if (error) {
      setMessage(`Error: ${error.message}`);
      return;
    }
    setConfig(next);
    setMessage('✓ Guardado correctamente');
    await revalidateHome();
  };

  const toggleProduct = (id: string) => {
    const marked = config.ids.includes(id);
    void persist({
      ...config,
      ids: marked ? config.ids.filter((x) => x !== id) : [...config.ids, id],
    });
  };

  const markedCount = config.ids.length;
  const filteredProducts = products.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black">🚚 Próximos ingresos</h1>
        <div className="text-sm text-neutral-600">{markedCount} productos en camino</div>
      </div>

      <p className="text-sm text-neutral-600">
        Marcá los productos que están en tránsito al showroom. En todo el sitio (catálogo,
        carruseles, buscador) su foto lleva la etiqueta &quot;🚚 En camino&quot;, y en su página
        se avisa que es una compra anticipada. Cuando el producto llegue, desmarcalo y listo.
      </p>

      {/* Buscador */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${
          message.includes('Error')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-neutral-600">Cargando productos...</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50">
              <tr className="border-b text-xs text-neutral-700 uppercase tracking-wider">
                <th className="p-4">Imagen</th>
                <th className="p-4">Título</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Precio</th>
                <th className="p-4 text-center">🚚 En camino</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const marked = config.ids.includes(p.id);
                return (
                  <tr
                    key={p.id}
                    className={`border-b hover:bg-neutral-50 transition-colors ${marked ? 'bg-sky-50' : ''}`}
                  >
                    <td className="p-4">
                      <div className="relative w-16 h-16 rounded overflow-hidden bg-neutral-100">
                        {p.images?.[0]?.url && (
                          <img
                            src={p.images[0].url}
                            alt={p.title}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-black">{p.title}</div>
                      <div className="text-xs text-neutral-500 mt-1">{p.slug}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.category === 'sneakers'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {p.category === 'sneakers' ? '👟 ' : '👕 '}
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-black">USD ${Number(p.price).toFixed(2)}</div>
                    </td>
                    <td className="p-4 text-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={marked}
                          onChange={() => toggleProduct(p.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
