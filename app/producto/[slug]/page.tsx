"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Product, ProductVariant } from '@/types/db';
import { formatCurrency } from '@/lib/utils';
import { AddToCart } from './parts/AddToCart';
import { ImageCarousel } from '@/components/pdp/ImageCarousel';
import { useDolarRate } from '@/components/DolarRateProvider';

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const supabase = createBrowserClient();
  const dolarOficial = useDolarRate();
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

  if (loading) return <div className="p-4">Cargando...</div>;
  if (!product) return <div className="p-4">Producto no encontrado</div>;

  const priceInArs = Number(product.price) * dolarOficial;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <ImageCarousel images={product.images} />
      </div>
      <div>
        <h1 className="text-xl font-semibold">{product.title}</h1>
        <div className="mt-1 text-3xl font-bold">USD ${Number(product.price).toFixed(2)}</div>
        <div className="text-sm text-neutral-400">{formatCurrency(priceInArs)}</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-medium text-green-800">Original 100%</span>
        </div>
        <div className="prose prose-sm mt-4 max-w-none">
          <p>{product.description}</p>
        </div>
        <div className="mt-6">
          <AddToCart product={product} variants={variants} />
        </div>
      </div>
    </div>
  );
}


