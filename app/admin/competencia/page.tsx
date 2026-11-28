"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Scale, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { CompetitorPlatform, CompetitorSite, Currency, PLATFORM_LABELS, normalizeSiteUrl, siteLabel } from '@/lib/competitors';
import { cn } from '@/lib/utils';

/**
 * Webs de otros revendedores para comparar precios. Al cargar una se prueba
 * si se puede leer automático (tiendas Shopify o WooCommerce); si no, queda
 * como acceso directo para buscar a mano desde cada producto.
 */

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900';

const PLATFORM_CHIP: Record<CompetitorPlatform, string> = {
  shopify: 'bg-green-100 text-green-800',
  woocommerce: 'bg-green-100 text-green-800',
  manual: 'bg-gray-100 text-gray-600',
};

async function detect(url: string): Promise<{ url: string; platform: CompetitorPlatform } | { error: string }> {
  try {
    const res = await fetch('/api/admin/competitors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.platform) return { error: body?.error || 'No se pudo probar la web.' };
    return body;
  } catch {
    return { error: 'Sin conexión.' };
  }
}

export default function CompetenciaPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [sites, setSites] = useState<CompetitorSite[]>([]);
  const [ready, setReady] = useState<boolean | null>(null);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('competitor_sites').select('*').order('name');
    setReady(!error);
    setSites((data || []) as CompetitorSite[]);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const origin = normalizeSiteUrl(url);
    if (!origin) {
      setMessage({ ok: false, text: 'Revisá la dirección: tiene que ser la web de la tienda, por ejemplo www.tienda.com.ar' });
      return;
    }
    if (sites.some((s) => s.url === origin)) {
      setMessage({ ok: false, text: 'Esa web ya está cargada.' });
      return;
    }
    setAdding(true);
    const result = await detect(origin);
    if ('error' in result) {
      setAdding(false);
      setMessage({ ok: false, text: result.error });
      return;
    }
    const { error } = await supabase
      .from('competitor_sites')
      .insert({ name: name.trim() || siteLabel(origin), url: result.url, platform: result.platform, currency: 'ARS', active: true });
    setAdding(false);
    if (error) {
      setMessage({ ok: false, text: error.code === '23505' ? 'Esa web ya está cargada.' : error.message });
      return;
    }
    setMessage(
      result.platform === 'manual'
        ? { ok: true, text: `Guardada. ${siteLabel(origin)} no se puede leer automático: en cada producto vas a tener el link para buscarlo ahí.` }
        : { ok: true, text: `Guardada. ${siteLabel(origin)} es una tienda ${PLATFORM_LABELS[result.platform]}: sus precios se comparan solos.` }
    );
    setUrl('');
    setName('');
    load();
  };

  const recheck = async (s: CompetitorSite) => {
    setChecking(s.id);
    const result = await detect(s.url);
    setChecking(null);
    if ('error' in result) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    await supabase.from('competitor_sites').update({ platform: result.platform }).eq('id', s.id);
    setMessage({ ok: true, text: `${s.name}: ${result.platform === 'manual' ? 'sigue sin poder leerse automático.' : `se lee automático (${PLATFORM_LABELS[result.platform]}).`}` });
    load();
  };

  const update = async (s: CompetitorSite, patch: Partial<CompetitorSite>) => {
    await supabase.from('competitor_sites').update(patch).eq('id', s.id);
    load();
  };

  const remove = async (s: CompetitorSite) => {
    if (!confirm(`¿Sacar ${s.name} de la competencia?`)) return;
    await supabase.from('competitor_sites').delete().eq('id', s.id);
    load();
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
          <Scale className="h-5 w-5 text-slate-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Competencia</h1>
          <p className="text-sm text-gray-500">Webs de otros revendedores para comparar tus precios en cada producto</p>
        </div>
      </div>

      {ready === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Falta un paso.</strong> Corré una vez <code className="rounded bg-white px-1 py-0.5">supabase/migration-costos.sql</code> en Supabase (SQL
          Editor) y recargá esta página.
        </div>
      )}

      <form onSubmit={add} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <h2 className="text-lg font-bold">Agregar una web</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Dirección de la web</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="www.tienda.com.ar"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Opcional" maxLength={60} className={inputClass} />
          </label>
        </div>
        {message && (
          <p role="status" className={cn('text-sm', message.ok ? 'text-green-700' : 'text-red-600')}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={adding || ready === false || !url.trim()}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {adding ? 'Probando la web…' : 'Agregar'}
        </button>
        <p className="text-xs text-gray-500">
          Las tiendas armadas con Shopify o WooCommerce se leen solas. Las de Tiendanube y otras quedan con un link para buscar a mano.
        </p>
      </form>

      {ready && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
          <h2 className="text-lg font-bold">Webs cargadas{sites.length > 0 ? ` · ${sites.length}` : ''}</h2>
          {sites.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Todavía no cargaste ninguna. Agregá las de los revendedores con los que competís.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {sites.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className={cn('text-sm font-semibold', s.active ? 'text-gray-900' : 'text-gray-400')}>
                      {s.name}{' '}
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-normal text-gray-500 hover:underline">
                        {siteLabel(s.url)}
                      </a>
                    </p>
                    <span className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium', PLATFORM_CHIP[s.platform])}>
                      {s.platform === 'manual' ? 'Link para buscar a mano' : `Se compara solo · ${PLATFORM_LABELS[s.platform]}`}
                    </span>
                  </div>
                  <div className="-ml-2 flex flex-wrap items-center gap-1 sm:ml-0">
                    {s.platform === 'shopify' && (
                      <label className="inline-flex min-h-[40px] items-center gap-1.5 px-2 text-xs text-gray-600">
                        Precios en
                        <select
                          value={s.currency}
                          onChange={(e) => update(s, { currency: e.target.value as Currency })}
                          className="rounded-md border border-gray-300 bg-white px-1.5 py-1 text-xs"
                        >
                          <option value="ARS">pesos</option>
                          <option value="USD">dólares</option>
                        </select>
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => recheck(s)}
                      disabled={checking === s.id}
                      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      <RefreshCw className={cn('h-4 w-4', checking === s.id && 'animate-spin')} /> Probar
                    </button>
                    <button
                      type="button"
                      onClick={() => update(s, { active: !s.active })}
                      className="min-h-[40px] rounded-lg px-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {s.active ? 'Pausar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s)}
                      aria-label={`Sacar ${s.name}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
