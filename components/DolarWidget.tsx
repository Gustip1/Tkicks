"use client";
import { useDolarRate } from '@/components/DolarRateProvider';

export function DolarWidget() {
  const rate = useDolarRate();

  if (!rate || rate <= 0) return null;

  return (
    <div className="text-xs text-neutral-400">
      Dólar Oficial: ${rate.toFixed(2)}
    </div>
  );
}

