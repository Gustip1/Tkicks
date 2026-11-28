"use client";
import { ExternalLink, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useDolarRate } from '@/components/DolarRateProvider';
import { formatARS, cn } from '@/lib/utils';
import {
  analyzeMargin,
  analyzeMarket,
  effectivePrice,
  marketSearchLinks,
  MarginLevel,
  pct,
  priceForMargin,
  TARGET_MARGIN,
  usdText,
} from '@/lib/pricing';
import { CostForm, positive } from '@/lib/admin/productCosts';

/**
 * Costo, margen y precio de mercado del producto, en el formulario del panel.
 * Todo se recalcula mientras se escribe. El costo es obligatorio; el precio de
 * mercado lo carga el dueño mirando las búsquedas de los botones (la web no lo
 * trae sola: ver el resumen del cambio, nov 2026).
 */

const LEVEL: Record<MarginLevel, { label: string; className: string }> = {
  loss: { label: 'Perdés plata', className: 'bg-red-100 text-red-800' },
  low: { label: 'Margen bajo', className: 'bg-amber-100 text-amber-800' },
  ok: { label: 'Margen sano', className: 'bg-green-100 text-green-800' },
  high: { label: 'Margen alto', className: 'bg-green-100 text-green-800' },
};

const inputClass =
  'w-full rounded-xl border bg-gray-50 pl-8 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-[box-shadow,background-color]';

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric' }).format(new Date(iso));

export function ProfitPanel({
  title,
  price,
  salePrice,
  form,
  onChange,
  error,
  ready,
  marketUpdatedAt,
  onUsePrice,
}: {
  title: string;
  price: number;
  salePrice: string;
  form: CostForm;
  onChange: (form: CostForm) => void;
  /** Error del costo al intentar guardar */
  error?: string | null;
  /** false si falta la migración de costos */
  ready: boolean;
  marketUpdatedAt?: string | null;
  /** Pone ese precio de lista (para el botón "Usar este precio") */
  onUsePrice?: (price: number) => void;
}) {
  const { rate } = useDolarRate();
  const sellAt = effectivePrice(price, salePrice);
  const onSale = sellAt < price;
  const cost = positive(form.cost);
  const marketPrice = positive(form.market);
  const margin = analyzeMargin(sellAt, cost);
  const market = analyzeMarket(sellAt, marketPrice, cost);
  const links = marketSearchLinks(title);
  const suggested = cost ? priceForMargin(cost) : null;
  const staleMarket = marketUpdatedAt && Date.now() - new Date(marketUpdatedAt).getTime() > 30 * 24 * 60 * 60 * 1000;

  const set = (patch: Partial<CostForm>) => onChange({ ...form, ...patch });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-gray-900">Rentabilidad y mercado</h2>
        <p className="mt-0.5 text-sm text-gray-500">Solo lo ves vos: el costo y el mercado no se muestran en la tienda.</p>
      </div>

      {!ready && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Falta un paso para guardar el costo: corré una vez <code className="rounded bg-white px-1">supabase/migration-costos.sql</code> en Supabase
          (SQL Editor). Mientras tanto el cálculo funciona, pero el costo no queda guardado.
        </div>
      )}

      {/* ── Costo y margen ── */}
      <div className="space-y-3">
        <div>
          <label htmlFor="product-cost" className="block text-sm font-medium text-gray-700 mb-1.5">
            Costo del producto (USD) <span className="text-red-600">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              id="product-cost"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.cost}
              onChange={(e) => set({ cost: e.target.value })}
              placeholder="Ej: 120"
              aria-invalid={Boolean(error)}
              aria-describedby="product-cost-hint"
              className={cn(inputClass, error ? 'border-red-400' : 'border-gray-200')}
            />
          </div>
          <p id="product-cost-hint" className={cn('mt-1 text-xs', error ? 'text-red-600 font-medium' : 'text-gray-500')}>
            {error || 'Lo que te costó, con el envío y los impuestos si los pagás vos.'}
          </p>
        </div>

        {margin ? (
          <div className="rounded-xl bg-gray-50 p-4" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', LEVEL[margin.level].className)}>{LEVEL[margin.level].label}</span>
              <span className="text-xs text-gray-500">
                {onSale ? `Calculado sobre la rebaja (${usdText(sellAt)})` : `Vendiendo a ${usdText(sellAt)}`}
              </span>
            </div>
            <p className={cn('mt-2 text-2xl font-semibold tabular-nums', margin.profit < 0 ? 'text-red-700' : 'text-gray-900')}>
              {margin.profit < 0 ? 'Perdés' : 'Ganás'} {usdText(Math.abs(margin.profit))}
              <span className="ml-1.5 text-sm font-normal text-gray-500">por unidad</span>
            </p>
            <p className="mt-0.5 text-sm text-gray-600 tabular-nums">
              {rate > 0 && <>≈ {formatARS(Math.abs(margin.profit) * rate)} · </>}
              Margen {margin.profit < 0 ? '-' : ''}
              {pct(margin.margin)} del precio · {margin.profit < 0 ? '-' : ''}
              {pct(margin.markup)} sobre el costo
            </p>
            {(margin.level === 'loss' || margin.level === 'low') && suggested && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 text-sm text-gray-700">
                <span>
                  Para ganar {pct(TARGET_MARGIN)} vendelo a <strong className="tabular-nums">{usdText(suggested)}</strong>.
                </span>
                {onUsePrice && !onSale && (
                  <button
                    type="button"
                    onClick={() => onUsePrice(suggested)}
                    className="min-h-[36px] rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:border-gray-500"
                  >
                    Usar este precio
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            {cost ? 'Poné el precio de venta para ver cuánto ganás.' : 'Cargá el costo y el precio para ver cuánto ganás.'}
          </p>
        )}
      </div>

      {/* ── Mercado ── */}
      <div className="space-y-3 border-t border-gray-100 pt-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="product-market" className="block text-sm font-medium text-gray-700 mb-1.5">
              Precio de mercado (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                id="product-market"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={form.market}
                onChange={(e) => set({ market: e.target.value })}
                placeholder="Lo que sale en otro lado"
                className={cn(inputClass, 'border-gray-200')}
              />
            </div>
          </div>
          <div>
            <label htmlFor="product-market-note" className="block text-sm font-medium text-gray-700 mb-1.5">
              Dónde lo viste
            </label>
            <input
              id="product-market-note"
              value={form.marketNote}
              onChange={(e) => set({ marketNote: e.target.value })}
              placeholder="Ej: StockX, talle 42"
              maxLength={120}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white"
            />
          </div>
        </div>

        {links.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Buscalo en</span>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:border-gray-400"
              >
                {l.label} <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ))}
          </div>
        )}

        {market ? (
          <div
            aria-live="polite"
            className={cn(
              'rounded-xl p-4',
              market.position === 'cheaper' ? 'bg-green-50' : market.position === 'pricier' ? 'bg-amber-50' : 'bg-gray-50'
            )}
          >
            <p className="flex items-center gap-2 text-base font-semibold text-gray-900">
              {market.position === 'cheaper' ? (
                <TrendingDown className="h-5 w-5 text-green-700" aria-hidden />
              ) : market.position === 'pricier' ? (
                <TrendingUp className="h-5 w-5 text-amber-700" aria-hidden />
              ) : (
                <Minus className="h-5 w-5 text-gray-600" aria-hidden />
              )}
              {market.position === 'cheaper'
                ? `Vendés ${pct(market.diff)} más barato que el mercado`
                : market.position === 'pricier'
                  ? `Vendés ${pct(market.diff)} más caro que el mercado`
                  : 'Estás en precio de mercado'}
            </p>
            <p className="mt-1 text-sm text-gray-700 tabular-nums">
              Tu precio {usdText(sellAt)} · mercado {usdText(market.market)} ({market.diff < 0 ? '-' : '+'}
              {usdText(Math.abs(sellAt - market.market))})
            </p>
            {market.atMarket && market.position !== 'aligned' && (
              <p className="mt-1 text-sm text-gray-600 tabular-nums">
                Al precio de mercado ganarías {usdText(market.atMarket.profit)} ({market.atMarket.profit < 0 ? '-' : ''}
                {pct(market.atMarket.margin)}).
              </p>
            )}
            {marketUpdatedAt && (
              <p className={cn('mt-2 text-xs', staleMarket ? 'font-medium text-amber-800' : 'text-gray-500')}>
                Precio de mercado cargado el {shortDate(marketUpdatedAt)}
                {staleMarket ? ': tiene más de un mes, conviene revisarlo.' : ''}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Cargá el precio de mercado para ver si vendés más barato o más caro que el resto.</p>
        )}
      </div>
    </div>
  );
}
