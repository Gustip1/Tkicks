"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product, ProductVariant } from '@/types/db';
import { formatCurrency } from '@/lib/utils';
import { AddToCart } from './parts/AddToCart';
import { ImageCarousel } from '@/components/pdp/ImageCarousel';
import { useDolarRate } from '@/components/DolarRateProvider';
import { Shield, Truck, Star } from 'lucide-react';

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const supabase = createBrowserClient();
  const { rate: dolarOficial } = useDolarRate();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('slug', params.slug)
        .single();
      
      if (!productData) {
        setLoading(false);
        return;
      }

      setProduct(productData as unknown as Product);

      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productData.id)
        .order('size', { ascending: true });

      setVariants((variantsData || []) as unknown as ProductVariant[]);
      setLoading(false);
    };

    loadProduct();
  }, [params.slug, supabase]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-black">Cargando producto...</p>
      </div>
    </div>
  );
  
  if (!product) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center bg-black">
      <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
        <span className="text-4xl">🔍</span>
      </div>
      <h2 className="text-xl font-black text-white mb-2">Producto no encontrado</h2>
      <p className="text-gray-400 font-bold">El producto que buscas no existe o fue eliminado.</p>
    </div>
  );

  const priceInArs = Number(product.price) * dolarOficial;

  return (
    <div className="max-w-7xl mx-auto animate-fadeIn bg-black min-h-screen overflow-x-hidden">
      {/* Breadcrumb */}
      <nav className="mb-4 md:mb-6 flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-gray-400 font-bold">
        <a href="/" className="hover:text-white transition-colors">Inicio</a>
        <span>/</span>
        <a href={`/productos?${product.category}`} className="hover:text-white transition-colors capitalize">
          {product.category}
        </a>
        <span>/</span>
        <span className="text-white font-black truncate max-w-[120px] md:max-w-[200px]">{product.title}</span>
      </nav>

      <div className="grid gap-3 md:gap-8 lg:gap-16 lg:grid-cols-2">
        {/* Image section */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <ImageCarousel images={product.images || []} />
        </div>
        
        {/* Product info section */}
        <div className="space-y-3 md:space-y-6">
          {/* Category badge */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full bg-green-500/20 text-green-400 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-black uppercase tracking-wide border border-green-500/50">
              {product.category}
            </span>
            {product.on_sale && (
              <span className="inline-flex items-center rounded-full bg-red-500/20 text-red-400 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-black uppercase tracking-wide border border-red-500/50">
                🔥 Oferta
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
            {product.title}
          </h1>
          
          {/* Rating placeholder */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 md:w-4 md:h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-[10px] md:text-sm text-gray-300 font-bold">(Verificado)</span>
          </div>

          {/* Price */}
          <div className="space-y-1 pb-3 md:pb-4 border-b border-zinc-800">
            <div className="flex items-baseline gap-2 md:gap-4">
              <span className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                ${Number(product.price).toFixed(2)} USD
              </span>
            </div>
            <p className="text-sm md:text-lg text-gray-300 font-bold">
              {formatCurrency(priceInArs)} <span className="text-xs md:text-sm">(al tipo de cambio actual)</span>
            </p>
          </div>
          
          {/* Add to cart section */}
          <div className="py-2 md:py-4">
            <AddToCart product={product} variants={variants} />
          </div>

          {/* Trust badges - SIN CAMBIOS NI DEVOLUCIONES */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 py-4 md:py-6 border-t border-zinc-800">
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-green-500/20 shrink-0">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-white truncate">100% Original</p>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold truncate">Garantía</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-500/20 shrink-0">
                <Truck className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-white truncate">Envío seguro</p>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold truncate">Todo el país</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-amber-500/20 shrink-0">
                <span className="text-sm md:text-lg">💳</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-white truncate">3 cuotas</p>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold truncate">Sin interés</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg md:rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-purple-500/20 shrink-0">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-black text-white truncate">Verificado</p>
                <p className="text-[10px] md:text-xs text-gray-400 font-bold truncate">Auténtico</p>
              </div>
            </div>
          </div>
          
          {/* Description */}
          {product.description && (
            <div className="py-6 border-t border-zinc-800">
              <h2 className="text-lg font-black text-white mb-4 uppercase tracking-wide">Descripción</h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-semibold">
                  {product.description}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
