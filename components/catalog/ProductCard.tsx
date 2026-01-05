"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Product } from '@/types/db';
import { formatCurrency, cn } from '@/lib/utils';
import { useDolarRate } from '@/components/DolarRateProvider';
import { Heart, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  size?: 'normal' | 'large';
}

export function ProductCard({ product, size = 'normal' }: ProductCardProps) {
  const [index, setIndex] = useState(0);
  const images = product.images || [];
  const [hovering, setHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { rate: dolarOficial } = useDolarRate();
  
  useEffect(() => {
    if (!hovering || images.length <= 1) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % images.length), 800);
    return () => window.clearInterval(timer);
  }, [hovering, images.length]);

  const priceInArs = Number(product.price) * dolarOficial;

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group block rounded-xl bg-zinc-900 overflow-hidden border border-zinc-800 hover:border-zinc-700 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 animate-fadeIn"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setIndex(0);
      }}
    >
      {/* Image container */}
      <div className={cn(
        "relative w-full overflow-hidden bg-surface",
        size === 'large' ? "aspect-[4/5]" : "aspect-square"
      )}>
        {/* Skeleton loader */}
        {!imageLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        
        {images[index]?.url && (
          <img
            src={images[index].url}
            alt={images[index].alt || product.title}
            loading="lazy"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-all duration-700",
              imageLoaded ? "opacity-100" : "opacity-0",
              hovering && "scale-110"
            )}
            onLoad={() => setImageLoaded(true)}
          />
        )}
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.on_sale && (
            <span className="px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-md">
              🔥 SALE
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-primary text-white text-xs font-semibold shadow-md">
            Original
          </span>
        </div>
        
        {/* Quick actions */}
        <div className={cn(
          "absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300",
          hovering ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
        )}>
          <button 
            className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 hover:scale-110 transition-all"
            aria-label="Agregar a favoritos"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Add to wishlist
            }}
          >
            <Heart className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        
        {/* Add to cart button */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-3 transition-all duration-300",
          hovering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <button 
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg"
            onClick={(e) => {
              e.preventDefault();
              // Navigate to product page
              window.location.href = `/producto/${product.slug}`;
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            Ver producto
          </button>
        </div>
        
        {/* Image indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  index === idx ? "bg-white w-4" : "bg-white/50"
                )}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Product info */}
      <div className={cn("p-4", size === 'large' && "p-5")}>
        {/* Category */}
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-bold">
          {product.category}
        </p>
        
        {/* Title */}
        <h3 className={cn(
          "font-bold text-white mb-2 line-clamp-2 group-hover:text-gray-200 transition-colors",
          size === 'large' ? "text-base min-h-[3rem]" : "text-sm min-h-[2.5rem]"
        )}>
          {product.title}
        </h3>
        
        {/* Price */}
        <div className="space-y-0.5">
          <p className={cn(
            "font-black text-white",
            size === 'large' ? "text-xl" : "text-lg"
          )}>
            ${Number(product.price).toFixed(2)} USD
          </p>
          <p className="text-sm text-gray-400 font-semibold">
            {formatCurrency(priceInArs)}
          </p>
        </div>
      </div>
    </Link>
  );
}
