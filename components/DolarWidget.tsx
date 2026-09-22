"use client";
import { useDolarRate } from '@/components/DolarRateProvider';

export function DolarWidget() {
  const { rate, isLoading, lastUpdate } = useDolarRate();

  if (!rate || rate <= 0) return null;

  return (
    <div className="t-fine text-gray-600 flex items-center gap-1 whitespace-nowrap">
      <span>Dólar oficial</span>
      <span className={`font-semibold text-gray-900 tabular-nums ${isLoading ? 'animate-pulse' : ''}`}>
        ${rate.toFixed(2)}
      </span>
      {lastUpdate && !isLoading && <span className="text-gray-500 hidden xl:inline">· {lastUpdate}</span>}
    </div>
  );
}
