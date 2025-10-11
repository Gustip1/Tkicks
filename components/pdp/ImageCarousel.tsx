"use client";
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ProductImage } from '@/types/db';

export function ImageCarousel({ images }: { images: ProductImage[] }) {
  const [ref, api] = useEmblaCarousel({ loop: true, align: 'start' });
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded border" ref={ref} aria-roledescription="carousel">
        <ul className="-ml-2 flex">
          {images.map((img) => (
            <li key={img.url} className="min-w-0 shrink-0 grow-0 basis-full pl-2">
              <div className="relative aspect-square w-full overflow-hidden">
                <Image src={img.url} alt={img.alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            className="h-2 w-2 rounded-full bg-neutral-300"
            aria-label={`Ir a imagen ${idx + 1}`}
            onClick={() => api?.scrollTo(idx)}
          />
        ))}
      </div>
    </div>
  );
}


