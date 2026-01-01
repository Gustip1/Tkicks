"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { ImageUploader, UploadedImage } from '@/components/admin/ImageUploader';
import { VariantEditor } from '@/components/admin/VariantEditor';
import { Save, Trash2, ArrowLeft, Eye, Package } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState<'sneakers' | 'streetwear'>('sneakers');
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [featuredSneakers, setFeaturedSneakers] = useState(false);
  const [featuredStreetwear, setFeaturedStreetwear] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [isNew, setIsNew] = useState<boolean>(false);
  const [active, setActive] = useState(true);
  const [variants, setVariants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        setOnSale(p.on_sale || false);
        setIsNew(!!p.is_new);
        setActive(p.active);
      }
      setVariants((v || []) as any);
      setLoading(false);
    })();
  }, [id, supabase]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    
    try {
      const { error: pErr } = await supabase
        .from('products')
        .update({ 
          title, 
          slug, 
          category, 
          price, 
          description, 
          images, 
          featured_sneakers: featuredSneakers, 
          featured_streetwear: featuredStreetwear,
          on_sale: onSale, 
          is_new: isNew,
          active 
        })
        .eq('id', id);
      
      if (pErr) {
        setError(pErr.message);
        return;
      }
      
      // Replace variants
      await supabase.from('product_variants').delete().eq('product_id', id);
      if (variants.length) {
        await supabase.from('product_variants').insert(
          variants.map((v: any) => ({ product_id: id, size: v.size, stock: Number(v.stock || 0) }))
        );
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) return alert(error.message);
    router.push('/admin/productos');
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Cargando producto...</p>
      </div>
    </div>
  );

  return (
    <form onSubmit={save} className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link 
            href="/admin/productos" 
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Editar producto</h1>
            <p className="text-sm text-gray-500 hidden sm:block">Modifica los detalles del producto</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {slug && (
            <Link
              href={`/producto/${slug}`}
              target="_blank"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span className="sm:hidden md:inline">Ver producto</span>
            </Link>
          )}
          <button 
            type="button" 
            onClick={remove} 
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </button>
        </div>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <span className="text-red-600">!</span>
          </div>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 flex items-center gap-3 animate-fadeIn">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-600">✓</span>
          </div>
          <p className="text-sm text-green-700">Producto guardado correctamente</p>
        </div>
      )}
      
      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column - Details */}
        <div className="lg:col-span-3 space-y-6">
          {/* Basic info card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              Información básica
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Título del producto</label>
              <input 
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Ej: Nike Air Max 90"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Slug (URL)</label>
                <input 
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all" 
                  value={slug} 
                  onChange={(e) => setSlug(e.target.value)} 
                  placeholder="nike-air-max-90"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Precio (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input 
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-8 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all" 
                    type="number" 
                    min={0} 
                    step="0.01"
                    value={price} 
                    onChange={(e) => setPrice(Number(e.target.value))} 
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory('sneakers')}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                    category === 'sneakers' 
                      ? "border-primary bg-primary-light text-primary" 
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  👟 Sneakers
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('streetwear')}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all",
                    category === 'streetwear' 
                      ? "border-primary bg-primary-light text-primary" 
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  👕 Streetwear
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
              <textarea 
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all resize-none" 
                rows={5} 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe las características del producto..."
              />
            </div>
          </div>
          
          {/* Variants card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Variantes (talles y stock)</h2>
            <VariantEditor value={variants as any} onChange={setVariants as any} />
          </div>
        </div>
        
        {/* Right column - Images & Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Imágenes del producto</h2>
            <ImageUploader value={images} onChange={setImages} />
          </div>
          
          {/* Settings card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Visibilidad y destacados</h2>
            
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={active} 
                onChange={(e) => setActive(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
              /> 
              <div>
                <p className="text-sm font-medium text-gray-900">Producto activo</p>
                <p className="text-xs text-gray-500">Visible en la tienda</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={onSale} 
                onChange={(e) => setOnSale(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
              /> 
              <div>
                <p className="text-sm font-medium text-gray-900">🔥 En oferta</p>
                <p className="text-xs text-gray-500">Aparece en la sección de ofertas</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={featuredSneakers} 
                onChange={(e) => setFeaturedSneakers(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              /> 
              <div>
                <p className="text-sm font-medium text-gray-900">👟 Destacado Sneakers</p>
                <p className="text-xs text-gray-500">Aparece en el carousel de sneakers</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={featuredStreetwear} 
                onChange={(e) => setFeaturedStreetwear(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              /> 
              <div>
                <p className="text-sm font-medium text-gray-900">👕 Destacado Streetwear</p>
                <p className="text-xs text-gray-500">Aparece en el carousel de streetwear</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
              <input 
                type="checkbox" 
                checked={isNew} 
                onChange={(e) => setIsNew(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              /> 
              <div>
                <p className="text-sm font-medium text-gray-900">🆕 Nuevos ingresos</p>
                <p className="text-xs text-gray-500">
                  Controla si aparece o no en la sección de &quot;Nuevos ingresos&quot;.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
      
      {/* Sticky save button (mobile) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:hidden z-30">
        <button 
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
      
      {/* Desktop save button */}
      <div className="hidden md:flex justify-end pt-4 border-t border-gray-200">
        <button 
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
      
      {/* Spacer for mobile sticky button */}
      <div className="h-20 md:hidden" />
    </form>
  );
}
