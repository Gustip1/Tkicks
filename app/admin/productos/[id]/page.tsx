"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { ImageUploader, UploadedImage } from '@/components/admin/ImageUploader';
import { VariantEditor } from '@/components/admin/VariantEditor';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<'sneakers' | 'streetwear'>('sneakers');
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [featuredSneakers, setFeaturedSneakers] = useState(false);
  const [featuredStreetwear, setFeaturedStreetwear] = useState(false);
  const [active, setActive] = useState(true);
  const [variants, setVariants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
      const { data: v } = await supabase.from('product_variants').select('*').eq('product_id', id);
      if (p) {
        setTitle(p.title);
        setSlug(p.slug);
        setCategory(p.category);
        setPrice(Number(p.price));
        setDescription(p.description || '');
        setImages((p.images || []) as UploadedImage[]);
        setFeaturedSneakers(p.featured_sneakers);
        setFeaturedStreetwear(p.featured_streetwear);
        setActive(p.active);
      }
      setVariants((v || []) as any);
      setLoading(false);
    })();
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error: pErr } = await supabase
      .from('products')
      .update({ title, slug, category, price, description, images, featured_sneakers: featuredSneakers, featured_streetwear: featuredStreetwear, active })
      .eq('id', id);
    if (pErr) return setError(pErr.message);
    // Replace variants: simplest approach
    await supabase.from('product_variants').delete().eq('product_id', id);
    if (variants.length) {
      await supabase.from('product_variants').insert(
        variants.map((v: any) => ({ product_id: id, size: v.size, stock: Number(v.stock || 0) }))
      );
    }
    alert('Guardado');
  };

  const remove = async () => {
    if (!confirm('¿Eliminar producto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return alert(error.message);
    window.location.href = '/admin/productos';
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar producto</h1>
        <button type="button" onClick={remove} className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white">Eliminar</button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Título</label>
            <input className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Slug</label>
              <input className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Precio</label>
              <input className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium">Categoría</label>
            <select className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" value={category} onChange={(e) => setCategory(e.target.value as any)}>
              <option value="sneakers">Sneakers</option>
              <option value="streetwear">Streetwear</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Descripción</label>
            <textarea className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featuredSneakers} onChange={(e) => setFeaturedSneakers(e.target.checked)} /> Destacado Sneakers
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featuredStreetwear} onChange={(e) => setFeaturedStreetwear(e.target.checked)} /> Destacado Streetwear
            </label>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Activo
          </label>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Imágenes</label>
            <ImageUploader value={images} onChange={setImages} />
          </div>
          <div>
            <label className="block text-sm font-medium">Variantes (talles)</label>
            <VariantEditor value={variants as any} onChange={setVariants as any} />
          </div>
        </div>
      </div>
      <div>
        <button className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Guardar</button>
      </div>
    </form>
  );
}


