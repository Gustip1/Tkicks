"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useDolarRate } from '@/components/DolarRateProvider';
import { formatARS, cn } from '@/lib/utils';
import { pct, usdText } from '@/lib/pricing';
import { CompetitorItem, CompetitorSite, sameProduct, siteLabel, similarity, summarizeCompetition, toUsd } from '@/lib/competitors';

/**
 * Precios del mismo producto en otras webs de revendedores (las que el dueño
 * cargó en /admin/competencia). Se busca solo al abrir el producto o al
 * cambiar el título, y con el botón "Buscar de nuevo".
 */

type SiteResult = { site: CompetitorSite; items: CompetitorItem[]; error: string | null; searchUrl: string };
type Response = { ready: boolean; sites: SiteResult[] };

const MIN_TITLE = 6;

export function CompetitorPrices({
  title,
  myPriceUsd,
  onUseAsMarket,
}: {
  title: string;
  /** El precio al que se vende (con la rebaja si hay) */
  myPriceUsd: number;
  /** Pone ese precio como precio de mercado, con la tienda como fuente */
  onUseAsMarket?: (usd: number, note: string) => void;
}) {
  const { rate } = useDolarRate();
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState('');
  const seq = useRef(0);

  const search = useCallback(async (q: string) => {
    const id = ++seq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/competitors?q=${encodeURIComponent(q)}`);
      const body = await res.json().catch(() => null);
      if (id !== seq.current) return;
      if (!res.ok || !body) throw new Error(body?.error || 'No se pudo buscar.');
      setData(body as Response);
      setSearched(q);
    } catch (e) {
      if (id === seq.current) setError(e instanceof Error ? e.message : 'No se pudo buscar.');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  // Busca solo cuando se deja de escribir el título
  useEffect(() => {
    const q = title.trim();
    if (q.length < MIN_TITLE || q === searched) return;
    const t = setTimeout(() => search(q), 1200);
    return () => clearTimeout(t);
  }, [title, searched, search]);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.sites.flatMap((r) =>
      r.items.map((item) => ({
        site: r.site,
        item,
        usd: toUsd(item.price, item.currency, rate),
        same: sameProduct(title, item.title),
      }))
    );
  }, [data, rate, title]);

  // El resumen solo cuenta el mismo producto, con stock
  const similar = rows.filter((r) => r.same && r.item.available !== false && r.usd !== null);
  const summary = summarizeCompetition(myPriceUsd, similar.map((r) => r.usd as number));
  const cheapest = summary ? similar.reduce((a, b) => ((a.usd as number) <= (b.usd as number) ? a : b)) : null;
  const storesWithSimilar = new Set(similar.map((r) => r.site.id)).size;

  const priceText = (item: CompetitorItem) => (item.currency === 'USD' ? usdText(item.price) : formatARS(item.price));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-gray-900">Otros revendedores</h2>
          <p className="mt-0.5 text-sm text-gray-500">El mismo producto en las webs de la competencia que cargaste.</p>
        </div>
        <button
          type="button"
          onClick={() => title.trim().length >= MIN_TITLE && search(title.trim())}
          disabled={loading || title.trim().length < MIN_TITLE}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} aria-hidden />
          <span className="hidden sm:inline">{loading ? 'Buscando…' : 'Buscar de nuevo'}</span>
        </button>
      </div>

      {title.trim().length < MIN_TITLE ? (
        <p className="text-sm text-gray-500">Escribí el nombre del producto para buscarlo en la competencia.</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">{error}</p>
      ) : !data ? (
        <div className="space-y-2" aria-hidden>
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : !data.ready ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Falta correr <code className="rounded bg-white px-1">supabase/migration-costos.sql</code> en Supabase para usar la comparación.
        </p>
      ) : data.sites.length === 0 ? (
        <p className="text-sm text-gray-600">
          Todavía no cargaste las webs de la competencia.{' '}
          <Link href="/admin/competencia" className="font-medium text-primary underline">
            Cargarlas
          </Link>
        </p>
      ) : (
        <>
          {summary && cheapest ? (
            <div
              aria-live="polite"
              className={cn('rounded-xl p-4', summary.diffVsAvg < -0.05 ? 'bg-green-50' : summary.diffVsAvg > 0.05 ? 'bg-amber-50' : 'bg-gray-50')}
            >
              <p className="text-base font-semibold text-gray-900">
                {summary.diffVsAvg < -0.05
                  ? `Vendés ${pct(summary.diffVsAvg)} más barato que ${summary.count === 1 ? cheapest.site.name : 'el promedio'}`
                  : summary.diffVsAvg > 0.05
                    ? `Vendés ${pct(summary.diffVsAvg)} más caro que ${summary.count === 1 ? cheapest.site.name : 'el promedio'}`
                    : summary.count === 1
                      ? `Estás al mismo precio que ${cheapest.site.name}`
                      : 'Estás en el promedio de la competencia'}
              </p>
              <p className="mt-1 text-sm text-gray-700 tabular-nums">
                {summary.count === 1
                  ? `Vos ${usdText(myPriceUsd)} · ${cheapest.site.name} ${usdText(summary.min)}`
                  : `Vos ${usdText(myPriceUsd)} · promedio ${usdText(summary.avg)} · el más barato ${usdText(summary.min)} (${cheapest.site.name})`}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Sobre {summary.count} {summary.count === 1 ? 'publicación' : 'publicaciones'} del mismo producto con stock en {storesWithSimilar}{' '}
                {storesWithSimilar === 1 ? 'tienda' : 'tiendas'}
                {summary.cheaperThanMe > 0 ? ` · ${summary.cheaperThanMe} más barato que vos` : ' · ninguno más barato que vos'}. Los pesos se pasan
                con el dólar de tu tienda.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              No encontramos este producto con stock en las webs que se leen automático. Revisá los resultados de abajo o buscalo a mano.
            </p>
          )}

          <ul className="divide-y divide-gray-100">
            {data.sites.map(({ site, items, error: siteError, searchUrl }) => {
              const list = items
                .map((item) => ({ item, usd: toUsd(item.price, item.currency, rate), same: sameProduct(title, item.title), score: similarity(title, item.title) }))
                .sort((a, b) => Number(b.same) - Number(a.same) || b.score - a.score)
                .slice(0, 3);
              return (
                <li key={site.id} className="py-3 first:pt-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-gray-900">
                      {site.name} <span className="font-normal text-gray-500">{siteLabel(site.url)}</span>
                    </p>
                    <a
                      href={searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Buscar ahí <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                  {siteError ? (
                    <p className="mt-1 text-xs text-amber-700">{siteError}</p>
                  ) : site.platform === 'manual' ? (
                    <p className="mt-1 text-xs text-gray-500">Esta web no se puede leer automático: buscalo a mano con el link.</p>
                  ) : list.length === 0 ? (
                    <p className="mt-1 text-xs text-gray-500">No lo tienen publicado.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {list.map(({ item, usd, same }) => {
                        const diff = usd !== null && myPriceUsd > 0 ? (myPriceUsd - usd) / usd : null;
                        return (
                          <li key={item.url} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-2 py-1.5', same ? 'bg-gray-50' : 'opacity-70')}>
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 basis-48 text-sm text-gray-800 hover:underline">
                              {item.title}
                              {item.available === false && <span className="ml-1.5 rounded bg-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600">sin stock</span>}
                              {!same && <span className="ml-1.5 text-[11px] text-gray-500">(otro modelo)</span>}
                            </a>
                            <span className="text-sm font-semibold tabular-nums text-gray-900">{priceText(item)}</span>
                            {item.currency === 'ARS' && usd !== null && <span className="text-xs tabular-nums text-gray-500">≈ {usdText(usd)}</span>}
                            {diff !== null && (
                              <span className={cn('text-xs font-medium tabular-nums', diff < -0.05 ? 'text-green-700' : diff > 0.05 ? 'text-amber-700' : 'text-gray-600')}>
                                {Math.abs(diff) <= 0.05 ? 'igual que vos' : diff < 0 ? `vos ${pct(diff)} más barato` : `vos ${pct(diff)} más caro`}
                              </span>
                            )}
                            {onUseAsMarket && usd !== null && same && (
                              <button
                                type="button"
                                onClick={() => onUseAsMarket(Math.round(usd * 100) / 100, site.name)}
                                className="min-h-[32px] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 hover:border-gray-400"
                              >
                                Usar como mercado
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-gray-500">
            <Link href="/admin/competencia" className="underline">
              Administrar webs de la competencia
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
