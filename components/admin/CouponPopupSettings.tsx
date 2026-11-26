"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Mail, MessageCircle, Send, Trash2 } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';
import { couponStatus, couponSummary } from '@/lib/coupons';
import {
  COUPON_POPUP_KEY,
  COUPON_TEMPLATE_TEXT,
  couponDescription,
  couponMessage,
  couponTemplateParams,
  CouponPopupSettings as Settings,
  DEFAULT_COUPON_POPUP,
  LIST_POPUP_FALLBACK_TITLE,
  LIST_POPUP_TEXTS,
  parseCouponPopup,
  Subscriber,
  SUBSCRIBER_STATUS_LABELS,
} from '@/lib/couponPopup';
import type { DiscountCode } from '@/types/db';
import { cn } from '@/lib/utils';

/**
 * Popup de cupón por WhatsApp: qué cupón entrega, qué dice, y la lista de
 * quienes dejaron su número. Va dentro de /admin/cupones.
 */

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400';

type WaStatus = { configured: boolean; template: string | null; lang: string | null };

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));

export function CouponPopupSettings({
  codes,
  brandNames,
  onChanged,
}: {
  codes: DiscountCode[];
  brandNames: Record<string, string>;
  /** Para que la lista de cupones se vuelva a cargar */
  onChanged: () => void;
}) {
  const supabase = useMemo(() => createBrowserClient(), []);
  // false si falta correr supabase/migration-suscriptores.sql
  const [ready, setReady] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_COUPON_POPUP);
  const [couponId, setCouponId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [wa, setWa] = useState<WaStatus | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [total, setTotal] = useState(0);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  // Modo lista: con qué cupón se arma el mensaje al tocar "Escribirle"
  const [sendCode, setSendCode] = useState('');
  const [copied, setCopied] = useState(false);

  const loadSubscribers = useCallback(async () => {
    const { data, count, error } = await supabase
      .from('subscribers')
      .select('id, phone, wa_number, coupon_code, source, status, wa_error, created_at, sent_at, details', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(100);
    setReady(!error);
    setSubscribers((data || []) as Subscriber[]);
    setTotal(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    loadSubscribers();
    supabase
      .from('settings')
      .select('value')
      .eq('key', COUPON_POPUP_KEY)
      .maybeSingle()
      .then(({ data }) => setSettings(parseCouponPopup(data?.value)));
    fetch('/api/admin/whatsapp')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setWa(d))
      .catch(() => {});
  }, [supabase, loadSubscribers]);

  // El cupón que hoy entrega el popup
  useEffect(() => {
    const current = codes.find((c) => c.popup === true);
    if (current) setCouponId((id) => id || current.id);
  }, [codes]);

  const coupon = codes.find((c) => c.id === couponId) ?? null;
  const usable = codes.filter((c) => ['active', 'scheduled'].includes(couponStatus(c)) || c.id === couponId);
  const summary = coupon ? couponSummary(coupon, brandNames) : null;
  const description = coupon ? couponDescription(coupon, brandNames) : '';
  const couponOk = !!coupon && couponStatus(coupon) === 'active';

  const list = settings.mode === 'list';

  // Al pasar a modo lista se proponen los textos del Black Friday (se pueden cambiar)
  const setMode = (mode: Settings['mode']) =>
    setSettings((s) => {
      if (mode === s.mode) return s;
      if (mode === 'list') {
        return { ...s, mode, title: s.title.trim() || LIST_POPUP_TEXTS.title, text: !s.text.trim() || s.text === DEFAULT_COUPON_POPUP.text ? LIST_POPUP_TEXTS.text : s.text };
      }
      return { ...s, mode, title: s.title === LIST_POPUP_TEXTS.title ? '' : s.title, text: s.text === LIST_POPUP_TEXTS.text ? DEFAULT_COUPON_POPUP.text : s.text };
    });

  const save = async () => {
    setMessage(null);
    if (settings.enabled && !list && !couponOk) {
      setMessage({ ok: false, text: 'Para prenderlo elegí un cupón que esté activo.' });
      return;
    }
    setSaving(true);
    // En modo lista no se toca qué cupón está marcado. En el otro, uno solo a
    // la vez: primero se desmarca el anterior
    const { error: clearErr } = list ? { error: null } : await supabase.from('discount_codes').update({ popup: false }).eq('popup', true);
    const { error: markErr } = !list && coupon ? await supabase.from('discount_codes').update({ popup: true }).eq('id', coupon.id) : { error: null };
    const { error: setErr } = await supabase
      .from('settings')
      .upsert({ key: COUPON_POPUP_KEY, value: { ...settings, title: settings.title.trim(), text: settings.text.trim() } }, { onConflict: 'key' });
    setSaving(false);
    const err = clearErr || markErr || setErr;
    if (err) {
      setMessage({ ok: false, text: `No se pudo guardar: ${err.message}` });
      return;
    }
    setMessage({
      ok: true,
      text: settings.enabled ? 'Guardado. El popup ya está prendido (puede tardar un minuto en verse).' : 'Guardado. El popup está apagado.',
    });
    onChanged();
  };

  const sendTest = async () => {
    if (!coupon) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone, params: couponTemplateParams(coupon, brandNames) }),
      });
      const data = await res.json().catch(() => null);
      setTestResult(
        data?.ok
          ? { ok: true, text: 'WhatsApp aceptó el mensaje. Fijate si te llegó.' }
          : { ok: false, text: data?.error || 'No se pudo enviar.' }
      );
    } catch {
      setTestResult({ ok: false, text: 'Sin conexión.' });
    } finally {
      setTesting(false);
    }
  };

  const markSent = async (s: Subscriber) => {
    await supabase
      .from('subscribers')
      .update({ status: 'sent', sent_at: new Date().toISOString(), ...(sendCode ? { coupon_code: sendCode } : {}) })
      .eq('id', s.id);
    loadSubscribers();
  };

  const emails = Array.from(new Set(subscribers.map((s) => s.details?.email).filter((e): e is string => !!e)));
  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(emails.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin permiso para copiar: quedan a la vista en la lista */
    }
  };

  /** El mensaje para una persona: con el cupón elegido arriba de la lista, o con el que ya recibió */
  const messageFor = (s: Subscriber) => {
    const c = codes.find((x) => x.code === (sendCode || s.coupon_code));
    return c ? couponMessage(c.code, couponDescription(c, brandNames)) : 'Hola, te escribo de Tkicks.';
  };

  const removeSubscriber = async (s: Subscriber) => {
    if (!confirm(`¿Borrar el número ${s.phone} de la lista?`)) return;
    await supabase.from('subscribers').delete().eq('id', s.id);
    loadSubscribers();
  };

  return (
    <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-4 md:p-6" aria-labelledby="popup-title">
      <div>
        <h2 id="popup-title" className="text-lg font-bold">
          Popup de cupón por WhatsApp
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Le aparece a quien visita la tienda. Puede entregar un cupón al instante, o armarte una lista con el email y el WhatsApp de cada persona para que
          los cupones los mandes vos.
        </p>
      </div>

      {ready === false && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Falta un paso para usarlo.</strong> Corré una vez el archivo{' '}
          <code className="rounded bg-white px-1 py-0.5">supabase/migration-suscriptores.sql</code> en Supabase (SQL Editor) y recargá esta página.
        </div>
      )}

      <fieldset disabled={ready !== true} className="space-y-4">
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
            className="h-5 w-5 shrink-0 rounded border-gray-300 accent-gray-900"
          />
          <span className="text-sm font-medium text-gray-900">Mostrar el popup en la tienda</span>
        </label>

        <div role="radiogroup" aria-label="Qué hace el popup" className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: 'coupon', title: 'Entrega un cupón al instante', hint: 'Piden el WhatsApp y reciben el cupón que elijas.' },
              { value: 'list', title: 'Arma una lista y los mandás vos', hint: 'Piden email y WhatsApp. Después le mandás a cada uno el cupón que quieras.' },
            ] as const
          ).map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={settings.mode === o.value}
              onClick={() => setMode(o.value)}
              className={cn(
                'min-h-[44px] rounded-lg border px-3.5 py-2.5 text-left transition-colors',
                settings.mode === o.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-800 hover:border-gray-500'
              )}
            >
              <span className="block text-sm font-semibold">{o.title}</span>
              <span className={cn('block text-xs', settings.mode === o.value ? 'text-white/80' : 'text-gray-500')}>{o.hint}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={cn('block', list && 'hidden')}>
            <span className="mb-1 block text-sm font-medium text-gray-700">Cupón que entrega</span>
            <select value={couponId} onChange={(e) => setCouponId(e.target.value)} className={inputClass}>
              <option value="">Elegí un cupón</option>
              {usable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {couponSummary(c, brandNames).headline}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-gray-500">
              Conviene uno con “Un uso por cliente” o “Solo primera compra”: el código es el mismo para todos.
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Aparece a los (segundos)</span>
            <input
              type="number"
              inputMode="numeric"
              min={2}
              max={60}
              value={settings.delaySeconds}
              onChange={(e) => setSettings((s) => ({ ...s, delaySeconds: Number(e.target.value) || 0 }))}
              className={inputClass}
            />
            <span className="mt-1 block text-xs text-gray-500">Una sola vez por persona. Si lo cierra, no vuelve por dos semanas.</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Título</span>
            <input
              value={settings.title}
              onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
              placeholder={list ? LIST_POPUP_FALLBACK_TITLE : summary?.headline ?? 'Vacío: el descuento del cupón'}
              maxLength={80}
              className={inputClass}
            />
            {!list && <span className="mt-1 block text-xs text-gray-500">Vacío: se usa el descuento del cupón.</span>}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Texto</span>
            <input value={settings.text} onChange={(e) => setSettings((s) => ({ ...s, text: e.target.value }))} maxLength={200} className={inputClass} />
          </label>
        </div>

        {list && (
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Así lo ve el cliente</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{settings.title.trim() || LIST_POPUP_FALLBACK_TITLE}</p>
            <p className="text-gray-700">{settings.text}</p>
            <p className="mt-2 text-gray-600">Le pide el email y el WhatsApp. Los cupones no se muestran: los mandás vos desde la lista de abajo.</p>
          </div>
        )}

        {!list && coupon && summary && (
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Así lo ve el cliente</p>
            <p className="mt-1 text-base font-semibold text-gray-900">{settings.title.trim() || summary.headline}</p>
            <p className="text-gray-700">{settings.text}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">Y este es el mensaje del cupón</p>
            <p className="mt-1 text-gray-700">{couponMessage(coupon.code, description)}</p>
            {!couponOk && <p className="mt-2 text-amber-700">Ojo: este cupón no está activo ahora. Mientras tanto el popup no aparece.</p>}
          </div>
        )}

        <div>
          {message && (
            <p role="status" className={cn('mb-3 text-sm', message.ok ? 'text-green-700' : 'text-red-600')}>
              {message.text}
            </p>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex min-h-[44px] items-center rounded-lg bg-gray-900 px-5 text-sm font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar popup'}
          </button>
        </div>
      </fieldset>

      {/* ── Envío automático ── */}
      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Envío automático por WhatsApp</h3>
        {wa?.configured ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-green-700">Conectado.</span> El cupón sale solo por WhatsApp con la plantilla{' '}
              <code className="rounded bg-gray-100 px-1 py-0.5">{wa.template}</code> ({wa.lang}). Si un envío falla, el cliente ve el código en pantalla.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700">Probar con mi número</span>
                <input type="tel" inputMode="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="264 480 2994" className={cn(inputClass, 'w-52')} />
              </label>
              <button
                type="button"
                onClick={sendTest}
                disabled={testing || !coupon || !testPhone.trim()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-800 hover:border-gray-500 disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {testing ? 'Enviando…' : 'Enviar prueba'}
              </button>
            </div>
            {testResult && (
              <p role="status" className={cn('text-sm', testResult.ok ? 'text-green-700' : 'text-red-600')}>
                {testResult.text}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-3 text-sm text-gray-700">
            <p>
              <span className="font-semibold text-amber-700">Sin conectar.</span> Mientras tanto el popup funciona igual: apenas dejan el número, el cupón se
              les muestra en pantalla y el número te queda acá para escribirles con un toque.
            </p>
            <details className="rounded-lg border border-gray-200 p-3">
              <summary className="cursor-pointer font-medium text-gray-900">Cómo conectar el envío automático</summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Hace falta la API oficial de WhatsApp (WhatsApp Business Platform, de Meta): es la única forma de que un mensaje salga solo. Se da de alta
                  en business.facebook.com con un número de WhatsApp.
                </li>
                <li>
                  En el administrador de WhatsApp de Meta, creá una plantilla de categoría Marketing, idioma Español (ARG), con este texto:
                  <span className="mt-1 block rounded bg-gray-100 p-2 font-mono text-xs">{COUPON_TEMPLATE_TEXT}</span>
                  {'{{1}}'} es el código y {'{{2}}'} lo que da el cupón. Meta la tiene que aprobar.
                </li>
                <li>
                  En Vercel → Settings → Environment Variables cargá <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code> y{' '}
                  <code>WHATSAPP_COUPON_TEMPLATE</code> (el nombre de la plantilla), y volvé a publicar.
                </li>
              </ol>
              <p className="mt-3 text-gray-600">Meta cobra cada mensaje de marketing que entrega. Acá no se repite el envío a un número que ya recibió el cupón.</p>
            </details>
          </div>
        )}
      </div>

      {/* ── Quiénes se sumaron ── */}
      {ready && (
        <div className="border-t border-gray-100 pt-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Números que se sumaron{total > 0 ? ` · ${total}` : ''}
          </h3>
          {subscribers.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">Todavía nadie dejó su número.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Cupón para el mensaje</span>
                  <select value={sendCode} onChange={(e) => setSendCode(e.target.value)} className={cn(inputClass, 'w-64 max-w-full')}>
                    <option value="">El que ya recibió cada uno</option>
                    {codes
                      .filter((c) => couponStatus(c) === 'active')
                      .map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code} · {couponSummary(c, brandNames).headline}
                        </option>
                      ))}
                  </select>
                </label>
                {emails.length > 0 && (
                  <button
                    type="button"
                    onClick={copyEmails}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-800 hover:border-gray-500"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copiados' : `Copiar los ${emails.length} emails`}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Elegí el cupón y tocá “WhatsApp” o “Email” en cada persona: se abre con el mensaje ya escrito.</p>

              <ul className="mt-3 divide-y divide-gray-100">
                {subscribers.map((s) => {
                  const text = messageFor(s);
                  const email = s.details?.email;
                  return (
                    <li key={s.id} className="flex flex-col gap-2 py-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold tabular-nums text-gray-900">
                          {s.phone}
                          {email && <span className="ml-2 break-all font-normal text-gray-600">{email}</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {shortDate(s.created_at)}
                          {s.coupon_code ? ` · ${s.coupon_code}` : ''} ·{' '}
                          <span className={s.status === 'pending' ? 'font-semibold text-amber-700' : undefined}>{SUBSCRIBER_STATUS_LABELS[s.status] ?? s.status}</span>
                        </p>
                        {s.status === 'failed' && s.wa_error && <p className="text-xs text-amber-700">Motivo: {s.wa_error}</p>}
                      </div>
                      <div className="-ml-3 flex flex-wrap items-center gap-1 lg:ml-0">
                        <a
                          href={`https://api.whatsapp.com/send?phone=${s.wa_number}&text=${encodeURIComponent(text)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          <MessageCircle className="h-4 w-4" /> WhatsApp
                        </a>
                        {email && (
                          <a
                            href={`mailto:${email}?subject=${encodeURIComponent('Tu descuento en Tkicks')}&body=${encodeURIComponent(text)}`}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <Mail className="h-4 w-4" /> Email
                          </a>
                        )}
                        {s.status !== 'sent' && (
                          <button
                            onClick={() => markSent(s)}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <Check className="h-4 w-4" /> Ya se lo mandé
                          </button>
                        )}
                        <button
                          onClick={() => removeSubscriber(s)}
                          aria-label={`Borrar ${s.phone}`}
                          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {total > subscribers.length && <p className="mt-2 text-xs text-gray-500">Se muestran los últimos {subscribers.length}.</p>}
        </div>
      )}
    </section>
  );
}
