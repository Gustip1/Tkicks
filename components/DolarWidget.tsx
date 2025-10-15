"use client";
import { useDolarRate } from '@/components/DolarRateProvider';

export function DolarWidget() {
  const { rate, isLoading, lastUpdate } = useDolarRate();

  if (!rate || rate <= 0) return null;

  return (
    <div className="text-xs text-neutral-400 flex items-center gap-1">
      <span>Dólar Oficial:</span>
      <span className={`font-semibold ${isLoading ? 'animate-pulse' : ''}`}>
        ${rate.toFixed(2)}
      </span>
      {lastUpdate && !isLoading && (
        <span className="text-neutral-500 text-[10px]">
          ({lastUpdate})
        </span>
      )}
      {isLoading && (
        <span className="text-neutral-500 text-[10px]">
          (actualizando...)
        </span>
      )}
    </div>
  );
}

