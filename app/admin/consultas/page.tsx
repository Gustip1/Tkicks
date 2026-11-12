"use client";
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { LEAD_LABELS, Lead, LeadStatus, leadSummary, replyLink } from '@/lib/leads';
import { LEADS_CHANGED_EVENT } from '@/components/admin/LeadsBell';
import { timeAgo } from '@/lib/admin/webSales';

type Filter = 'new' | 'answered' | 'all';

const KIND_TONE: Record<Lead['kind'], string> = {
  offer: 'bg-blue-100 text-blue-800',
  size_request: 'bg-yellow-100 text-yellow-800',
  question: 'bg-gray-100 text-gray-700',
  custom_order: 'bg-green-100 text-green-800',
};

const BROWSER_LABEL: Record<string, string> = {
  instagram: 'Desde Instagram',
  facebook: 'Desde Facebook',
  tiktok: 'Desde TikTok',
};

/**
 * Lo que la gente dejó en la web: ofertas, talles que busca, dudas y encargos,
 * cada uno con su WhatsApp. Antes solo existían si la persona llegaba a
 * mandar el mensaje; ahora quedan acá y el que escribe es el dueño.
 */
export default function ConsultasPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<Filter>('new');
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');

  const load = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) {
      setState('missing');
      return;
    }
    setLeads((data ?? []) as Lead[]);
    setState('ready');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    setLeads((list) => list.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    const supabase = createBrowserClient();
    const { error } = await supabase.from('leads').update({ status }).eq('id', lead.id);
    if (error) void load();
    window.dispatchEvent(new Event(LEADS_CHANGED_EVENT));
  };

  const pending = leads.filter((l) => l.status === 'new').length;
  const shown = leads.filter((l) => (filter === 'all' ? l.status !== 'discarded' : l.status === filter));

  if (state === 'missing') {
    return (
      <div className="max-w-2xl rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
        <h2 className="text-base font-semibold text-gray-900">Falta un paso para activar las consultas</h2>
        <p className="mt-1.5 text-sm text-gray-700">
          Abrí Supabase, entrá a SQL Editor, pegá el contenido de <code className="rounded bg-white px-1.5 py-0.5 text-[13px]">supabase/migration-consultas.sql</code> y
          tocá Run. Mientras tanto la web sigue mandando a la gente a WhatsApp como antes.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-gray-600">
        Acá queda todo lo que te dejan en la web con su número, aunque nunca lleguen a mandarte el WhatsApp. Escribiles vos:
        el botón abre el chat con el mensaje empezado.
      </p>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar consultas">
        {([
          ['new', `Sin responder${pending ? ` (${pending})` : ''}`],
          ['answered', 'Respondidas'],
          ['all', 'Todas'],
        ] as [Filter, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              filter === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {state === 'loading' ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-sm font-semibold text-gray-900">
            {filter === 'new' ? 'No hay consultas sin responder' : 'Todavía no hay consultas acá'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Cuando alguien haga una oferta, pida un talle o deje su número, aparece en esta lista y te avisa la campanita verde.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((l) => {
            const browser = BROWSER_LABEL[String(l.details?.browser ?? '')];
            return (
              <li key={l.id} className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${KIND_TONE[l.kind]}`}>{LEAD_LABELS[l.kind]}</span>
                  <span className="text-xs text-gray-500">{timeAgo(l.created_at)}</span>
                  {browser && <span className="text-xs text-gray-400">· {browser}</span>}
                  {l.status === 'answered' && <span className="ml-auto text-xs font-semibold text-green-700">Respondida</span>}
                </div>

                <p className="mt-2 text-base font-semibold text-gray-900">{leadSummary(l)}</p>
                {l.product_slug && (
                  <Link href={`/producto/${l.product_slug}`} target="_blank" className="text-sm text-blue-600 hover:underline">
                    Ver el producto
                  </Link>
                )}
                {l.message && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{l.message}</p>}

                <p className="mt-3 text-sm text-gray-700">
                  {l.name ? `${l.name} · ` : ''}
                  <span className="font-semibold tabular-nums text-gray-900">{l.phone}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={replyLink(l)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => l.status === 'new' && void setStatus(l, 'answered')}
                    className="inline-flex min-h-[40px] items-center rounded-full bg-[#25D366] px-4 text-sm font-semibold text-white hover:brightness-105"
                  >
                    Escribirle por WhatsApp
                  </a>
                  {l.status === 'new' ? (
                    <>
                      <button onClick={() => void setStatus(l, 'answered')} className="min-h-[40px] rounded-full bg-gray-100 px-4 text-sm font-medium text-gray-800 hover:bg-gray-200">
                        Ya le respondí
                      </button>
                      <button onClick={() => void setStatus(l, 'discarded')} className="min-h-[40px] rounded-full px-3 text-sm text-gray-500 hover:bg-gray-100">
                        Descartar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => void setStatus(l, 'new')} className="min-h-[40px] rounded-full px-3 text-sm text-gray-500 hover:bg-gray-100">
                      Volver a sin responder
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
