"use client";
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductImage } from '@/types/db';
import { cn } from '@/lib/utils';

export function ImageCarousel({ images }: { images: ProductImage[] }) {
  const [ref, api] = useEmblaCarousel({ loop: true, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});

  const onSelect = useCallback(() => {
    if (!api) return;
    setSelectedIndex(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    api.on('reInit', onSelect);
    
    return () => {
      api.off('select', onSelect);
      api.off('reInit', onSelect);
    };
  }, [api, onSelect]);

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  if (!images || images.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Main image carousel */}
      <div className="relative group rounded-2xl overflow-hidden bg-gray-50 shadow-lg">
        <div className="overflow-hidden" ref={ref} aria-roledescription="carousel">
          <ul className="flex">
            {images.map((img, idx) => (
              <li key={img.url} className="min-w-0 shrink-0 grow-0 basis-full">
                <div className="relative aspect-square w-full overflow-hidden">
                  <Image 
                    src={img.url} 
                    alt={img.alt || `Imagen ${idx + 1}`} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 50vw" 
                    className={cn(
                      "object-cover transition-all duration-500",
                      imageLoaded[idx] ? "opacity-100 scale-100" : "opacity-0 scale-105"
                    )}
                    priority={idx === 0}
                    loading={idx === 0 ? undefined : 'lazy'}
                    onLoad={() => setImageLoaded(prev => ({ ...prev, [idx]: true }))}
                    quality={90}
                  />
                  {!imageLoaded[idx] && (
                    <div className="absolute inset-0 bg-gray-200 animate-pulse" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Navigation arrows - always visible on mobile, hover on desktop */}
        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/98 shadow-xl border border-gray-200 transition-all hover:scale-110 hover:shadow-2xl active:scale-95 opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-gray-900" strokeWidth={2.5} />
            </button>
            <button
              onClick={scrollNext}
              className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-11 h-11 md:w-12 md:h-12 rounded-full bg-white/98 shadow-xl border border-gray-200 transition-all hover:scale-110 hover:shadow-2xl active:scale-95 opacity-100 md:opacity-0 md:group-hover:opacity-100"
              aria-label="Siguiente imagen"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-gray-900" strokeWidth={2.5} />
            </button>
          </>
        )}

        {/* Image counter badge */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-full bg-black/75 text-white text-sm font-medium backdrop-blur-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        )}
      </div>
      
      {/* Thumbnail navigation */}
      {images.length > 1 && (
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, idx) => (
            <button
              key={idx}
              className={cn(
                "relative shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200",
                selectedIndex === idx 
                  ? 'ring-2 ring-black ring-offset-2 scale-105 border-black' 
                  : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-400'
              )}
              aria-label={`Ver imagen ${idx + 1}`}
              onClick={() => api?.scrollTo(idx)}
            >
              <Image
                src={img.url}
                alt={img.alt || `Miniatura ${idx + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
