"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ImageUploader, UploadedImage } from '@/components/admin/ImageUploader';

const CATS = [
  { label: 'Remeras',    sub: 'remeras' },
  { label: 'Hoodies',    sub: 'hoodies' },
  { label: 'Pantalones', sub: 'pantalones' },
] as const;

type TileConfig = { sub: string; label?: string; url?: string };

export default function AdminPortadaPage() {
  const [tiles, setTiles] = useState<Record<string, UploadedImage[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'homepage_categories')
        .maybeSingle();

      const cfg = (data?.value as TileConfig[] | null) || [];
      const next: Record<string, UploadedImage[]> = {};
      CATS.forEach((c) => {
        const found = Array.isArray(cfg) ? cfg.find((t) => t.sub === c.sub) : undefined;
        next[c.sub] = found?.url ? [{ url: found.url, alt: c.label }] : [];
      });
      setTiles(next);
      setLoading(false);
    })();
  }, []);

  const setSlot = (sub: string, imgs: UploadedImage[]) => {
    // Una sola imagen por categoría: nos quedamos con la última agregada
    setTiles((prev) => ({ ...prev, [sub]: imgs.slice(-1) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const supabase = createBrowserClient();

    const value: TileConfig[] = CATS.map((c) => ({
      sub: c.sub,
      label: c.label,
      url: tiles[c.sub]?.[0]?.url || undefined,
    }));

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'homepage_categories', value }, { onConflict: 'key' });

    if (error) {
      setMessage(`Error al guardar: ${error.message}`);
    } else {
      setMessage('✓ Imágenes de portada guardadas correctamente');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Portada · Categorías</h1>
        <p className="text-sm text-gray-500 mt-1">
          Elegí la imagen que se muestra en cada categoría de la sección de accesos directos en la home.
          Si no subís ninguna, se usa automáticamente la última foto del producto más reciente de esa categoría.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-800">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Cargando…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CATS.map((c) => (
            <div key={c.sub} className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">{c.label}</h2>
                {tiles[c.sub]?.length > 0 && (
                  <span className="text-xs font-semibold text-emerald-600">Imagen elegida</span>
                )}
              </div>
              <ImageUploader
                value={tiles[c.sub] || []}
                onChange={(imgs) => setSlot(c.sub, imgs)}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-black uppercase tracking-tight text-white hover:bg-black disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
