"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { DiscountCode, DiscountType } from '@/types/db';
import { CouponStatus, couponStatus, couponSummary, dayEndAR, dayStartAR, toDateInputAR, usd } from '@/lib/coupons';
import { Pencil, Plus, Shuffle, Ticket, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CouponPopupSettings } from '@/components/admin/CouponPopupSettings';

/**
 * Cupones de descuento. Cada cupón puede llevar condiciones para que tenga
 * sentido comercial: compra mínima, tope, a qué productos aplica, con qué medio
 * de pago, cuántas veces y hasta cuándo. Abajo del formulario se lee, en una
 * frase, lo que va a ver el cliente.
 */

type Category = '' | 'sneakers' | 'streetwear';
type PaymentScope = '' | 'transfer_cash' | 'card';

interface Form {
  code: string;
  note: string;
  type: DiscountType;
  value: string;
  maxDiscount: string;
  minSubtotal: string;
  category: Category;
  brands: string[];
  excludeSale: boolean;
  paymentScope: PaymentScope;
  maxUses: string;
  oncePerCustomer: boolean;
  firstPurchaseOnly: boolean;
  startsAt: string;
  endsAt: string;
}

const EMPTY: Form = {
  code: '',
  note: '',
  type: 'percent',
  value: '',
  maxDiscount: '',
  minSubtotal: '',
  category: '',
  brands: [],
  excludeSale: false,
  paymentScope: '',
  maxUses: '',
  oncePerCustomer: false,
  firstPurchaseOnly: false,
  startsAt: '',
  endsAt: '',
};

const fromCoupon = (dc: DiscountCode): Form => ({
  code: dc.code,
  note: dc.note ?? '',
  type: dc.type,
  value: String(dc.value ?? ''),
  maxDiscount: dc.max_discount != null ? String(dc.max_discount) : '',
  minSubtotal: dc.min_subtotal != null ? String(dc.min_subtotal) : '',
  category: (dc.applies_category ?? '') as Category,
  brands: Array.isArray(dc.applies_brands) ? dc.applies_brands : [],
  excludeSale: !!dc.exclude_sale,
  paymentScope: (dc.payment_scope ?? '') as PaymentScope,
  maxUses: dc.max_uses != null ? String(dc.max_uses) : '',
  oncePerCustomer: !!dc.once_per_customer,
  firstPurchaseOnly: !!dc.first_purchase_only,
  startsAt: toDateInputAR(dc.starts_at),
  endsAt: toDateInputAR(dc.ends_at),
});

const numOrNull = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

/** El cupón tal como se guarda, a partir del formulario */
function toRow(f: Form) {
  return {
    code: f.code.trim().toUpperCase(),
    type: f.type,
    value: numOrNull(f.value) ?? 0,
    max_uses: numOrNull(f.maxUses) !== null ? Math.floor(numOrNull(f.maxUses)!) : null,
    starts_at: f.startsAt ? dayStartAR(f.startsAt) : null,
    ends_at: f.endsAt ? dayEndAR(f.endsAt) : null,
  };
}

function toRules(f: Form) {
  return {
    min_subtotal: numOrNull(f.minSubtotal),
    max_discount: f.type === 'percent' ? numOrNull(f.maxDiscount) : null,
    once_per_customer: f.oncePerCustomer,
    first_purchase_only: f.firstPurchaseOnly,
    exclude_sale: f.excludeSale,
    applies_category: f.category || null,
    applies_brands: f.brands.length > 0 ? f.brands : null,
    payment_scope: f.paymentScope || null,
    note: f.note.trim() || null,
  };
}

function validate(f: Form): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const code = f.code.trim().toUpperCase();
  const value = numOrNull(f.value);
  const min = numOrNull(f.minSubtotal);
  const cap = numOrNull(f.maxDiscount);

  if (!/^[A-Z0-9_-]{3,24}$/.test(code)) errors.push('El código lleva entre 3 y 24 letras o números, sin espacios.');
  if (value === null) errors.push('Poné cuánto descuenta.');
  if (f.type === 'percent' && value !== null && value > 100) errors.push('Un porcentaje no puede pasar de 100.');
  if (f.maxUses.trim() && (numOrNull(f.maxUses) === null || !Number.isInteger(numOrNull(f.maxUses)))) errors.push('La cantidad de usos tiene que ser un número entero.');
  if (f.startsAt && f.endsAt && f.endsAt < f.startsAt) errors.push('La fecha de fin es anterior a la de inicio.');

  if (value !== null) {
    if (f.type === 'percent' && value >= 50 && cap === null) {
      warnings.push(`${value}% es un descuento grande y no tiene tope: en un pedido de US$ 500 son US$ ${(500 * value) / 100}.`);
    }
    if (f.type === 'fixed' && (min === null || min < value)) {
      warnings.push(`Sin una compra mínima mayor a ${usd(value)}, un pedido de ese valor o menos queda en cero.`);
    }
    if (f.type === 'fixed' && min !== null && min >= value && value / min > 0.5) {
      warnings.push(`En una compra de ${usd(min)} este cupón descuenta el ${Math.round((value / min) * 100)}%.`);
    }
  }
  if (!f.maxUses.trim() && !f.endsAt && !f.oncePerCustomer) {
    warnings.push('No tiene vencimiento ni límite de usos: vale para siempre y cualquiera puede usarlo las veces que quiera.');
  }
  return { errors, warnings };
}

const STATUS: Record<CouponStatus, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-green-100 text-green-700' },
  paused: { label: 'Pausado', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Programado', className: 'bg-blue-50 text-blue-700' },
  expired: { label: 'Vencido', className: 'bg-amber-50 text-amber-700' },
  exhausted: { label: 'Agotado', className: 'bg-amber-50 text-amber-700' },
};

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400';

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

/** Opciones excluyentes, como botones (más cómodo en el celular que un desplegable) */
function Choice<T extends string>({
  value,
  onChange,
  options,
  disabled,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-h-[44px] rounded-lg border px-3.5 text-sm transition-colors disabled:opacity-50',
            value === o.value ? 'border-gray-900 bg-gray-900 font-semibold text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Check({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={cn('flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5', disabled && 'cursor-not-allowed opacity-50')}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 accent-gray-900"
      />
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
    </label>
  );
}

export default function CuponesPage() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [brands, setBrands] = useState<{ name: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // false si todavía no se corrió supabase/migration-cupones-reglas.sql
  const [rulesReady, setRulesReady] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const load = async () => {
    const { data } = await supabase.from('discount_codes').select('*').order('created_at', { ascending: false });
    setCodes((data || []) as DiscountCode[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    supabase.from('brands').select('name, slug').eq('active', true).order('name').then(({ data }) => setBrands((data || []) as { name: string; slug: string }[]));
    // ¿Existen las columnas de condiciones?
    supabase.from('discount_codes').select('min_subtotal').limit(1).then(({ error: err }) => setRulesReady(!err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brandNames = useMemo(() => Object.fromEntries(brands.map((b) => [b.slug, b.name])), [brands]);
  const { errors, warnings } = useMemo(() => validate(form), [form]);
  const preview = useMemo(() => couponSummary({ ...toRow(form), ...toRules(form), used_count: 0, active: true }, brandNames), [form, brandNames]);

  const reset = () => {
    setForm(EMPTY);
    setEditingId(null);
    setTried(false);
    setError(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.length > 0) return;
    setError(null);
    setSaving(true);

    const row = { ...toRow(form), ...(rulesReady ? toRules(form) : {}) };
    const { error: err } = editingId
      ? await supabase.from('discount_codes').update(row).eq('id', editingId)
      : await supabase.from('discount_codes').insert(row);

    setSaving(false);
    if (err) {
      setError(
        err.code === '23505'
          ? `Ya existe un cupón con el código ${row.code}.`
          : /column|schema cache/i.test(err.message)
            ? 'Falta correr la migración de cupones en Supabase (ver el aviso de arriba).'
            : err.message
      );
      return;
    }
    reset();
    load();
  };

  const edit = (dc: DiscountCode) => {
    setForm(fromCoupon(dc));
    setEditingId(dc.id);
    setTried(false);
    setError(null);
    formRef.current?.scrollIntoView({ block: 'start' });
  };

  const toggle = async (dc: DiscountCode) => {
    await supabase.from('discount_codes').update({ active: !dc.active }).eq('id', dc.id);
    load();
  };

  const remove = async (dc: DiscountCode) => {
    const msg =
      dc.used_count > 0
        ? `${dc.code} ya se usó ${dc.used_count} ${dc.used_count === 1 ? 'vez' : 'veces'}. Si lo eliminás no se puede recuperar (los pedidos conservan el descuento). Para que deje de valer alcanza con pausarlo. ¿Eliminarlo igual?`
        : `¿Eliminar el cupón ${dc.code}?`;
    if (!confirm(msg)) return;
    await supabase.from('discount_codes').delete().eq('id', dc.id);
    if (editingId === dc.id) reset();
    load();
  };

  const randomCode = () => {
    // Sin 0/O ni 1/I: se dictan por WhatsApp y se confunden
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    set('code', 'TK' + Array.from(bytes, (b) => chars[b % chars.length]).join(''));
  };

  const toggleBrand = (slug: string) => set('brands', form.brands.includes(slug) ? form.brands.filter((b) => b !== slug) : [...form.brands, slug]);

  return (
    <div className="space-y-6 text-black">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
          <Ticket className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Cupones</h1>
          <p className="text-sm text-gray-500">Códigos de descuento que el cliente carga en el checkout</p>
        </div>
      </div>

      {!rulesReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Falta un paso para usar las condiciones.</strong> Corré una vez el archivo{' '}
          <code className="rounded bg-white px-1 py-0.5">supabase/migration-cupones-reglas.sql</code> en Supabase (SQL Editor). Mientras tanto podés crear
          cupones simples: porcentaje o monto, usos y fechas.
        </div>
      )}

      <form ref={formRef} onSubmit={save} className="scroll-mt-20 space-y-6 rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{editingId ? `Editar ${form.code}` : 'Nuevo cupón'}</h2>
          {editingId && (
            <button type="button" onClick={reset} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100">
              <X className="h-4 w-4" /> Cancelar
            </button>
          )}
        </div>

        {/* ── Descuento ── */}
        <fieldset className="space-y-4">
          <legend className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Descuento</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código" hint={editingId ? 'El código no se cambia: los pedidos que ya lo usaron lo tienen guardado.' : 'Lo que escribe el cliente. Sin espacios.'}>
              <div className="flex gap-2">
                <input
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                  disabled={!!editingId}
                  placeholder="BIENVENIDO10"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={24}
                  className={cn(inputClass, 'font-mono font-bold')}
                />
                {!editingId && (
                  <button type="button" onClick={randomCode} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:border-gray-500" title="Generar un código al azar">
                    <Shuffle className="h-4 w-4" /> Generar
                  </button>
                )}
              </div>
            </Field>
            <Field label="Nota interna" hint="Para quién o para qué es. El cliente no la ve.">
              <input value={form.note} onChange={(e) => set('note', e.target.value)} disabled={!rulesReady} placeholder="Ej: seguidores del sorteo de noviembre" maxLength={120} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Tipo</span>
              <Choice
                label="Tipo de descuento"
                value={form.type}
                onChange={(v) => set('type', v)}
                options={[
                  { value: 'percent', label: 'Porcentaje' },
                  { value: 'fixed', label: 'Monto fijo' },
                ]}
              />
            </div>
            <Field label={form.type === 'percent' ? 'Porcentaje (%)' : 'Monto (USD)'}>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={form.value} onChange={(e) => set('value', e.target.value)} placeholder={form.type === 'percent' ? '10' : '15'} className={inputClass} />
            </Field>
            {form.type === 'percent' && (
              <Field label="Tope del descuento (USD)" hint="Lo máximo que puede descontar. Vacío: sin tope.">
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} disabled={!rulesReady} placeholder="Sin tope" className={inputClass} />
              </Field>
            )}
          </div>
        </fieldset>

        {/* ── Condiciones ── */}
        <fieldset className="space-y-4 border-t border-gray-100 pt-5" disabled={!rulesReady}>
          <legend className="mb-3 float-left w-full text-sm font-bold uppercase tracking-wide text-gray-500">Cuándo vale</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-2">
            <Field label="Compra mínima (USD)" hint="Se mide sobre los productos a los que aplica el cupón. Vacío: sin mínimo.">
              <input type="number" inputMode="decimal" min="0" step="0.01" value={form.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} placeholder="Sin mínimo" className={inputClass} />
            </Field>
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">Medio de pago</span>
              <Choice
                label="Medio de pago"
                value={form.paymentScope}
                onChange={(v) => set('paymentScope', v)}
                disabled={!rulesReady}
                options={[
                  { value: '', label: 'Cualquiera' },
                  { value: 'transfer_cash', label: 'Transferencia o efectivo' },
                  { value: 'card', label: 'Tarjeta' },
                ]}
              />
            </div>
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">Aplica a</span>
            <Choice
              label="Categoría"
              value={form.category}
              onChange={(v) => set('category', v)}
              disabled={!rulesReady}
              options={[
                { value: '', label: 'Todo' },
                { value: 'sneakers', label: 'Sneakers' },
                { value: 'streetwear', label: 'Streetwear' },
              ]}
            />
          </div>

          {brands.length > 0 && (
            <div>
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Marcas <span className="font-normal text-gray-500">— sin elegir ninguna, vale para todas</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => {
                  const on = form.brands.includes(b.slug);
                  return (
                    <button
                      key={b.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleBrand(b.slug)}
                      className={cn(
                        'min-h-[40px] rounded-full border px-3.5 text-sm transition-colors disabled:opacity-50',
                        on ? 'border-gray-900 bg-gray-900 font-semibold text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                      )}
                    >
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Check checked={form.excludeSale} onChange={(v) => set('excludeSale', v)} disabled={!rulesReady} label="No sumar a ofertas" hint="No descuenta sobre productos que ya tienen precio de oferta." />
            <Check checked={form.oncePerCustomer} onChange={(v) => set('oncePerCustomer', v)} disabled={!rulesReady} label="Un uso por cliente" hint="Se controla por email y DNI." />
            <Check checked={form.firstPurchaseOnly} onChange={(v) => set('firstPurchaseOnly', v)} disabled={!rulesReady} label="Solo primera compra" hint="Para quien todavía no tiene un pedido pagado." />
          </div>
        </fieldset>

        {/* ── Límites ── */}
        <fieldset className="space-y-4 border-t border-gray-100 pt-5">
          <legend className="mb-3 float-left w-full text-sm font-bold uppercase tracking-wide text-gray-500">Límites</legend>
          <div className="clear-both grid gap-4 sm:grid-cols-3">
            <Field label="Usos en total" hint="Cuántas compras pueden usarlo. Vacío: sin límite.">
              <input type="number" inputMode="numeric" min="1" step="1" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} placeholder="Sin límite" className={inputClass} />
            </Field>
            <Field label="Vale desde" hint="Vacío: desde ahora.">
              <input type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Vale hasta" hint="Incluye ese día completo.">
              <input type="date" value={form.endsAt} min={form.startsAt || undefined} onChange={(e) => set('endsAt', e.target.value)} className={inputClass} />
            </Field>
          </div>
        </fieldset>

        {/* ── Cómo queda ── */}
        <div className="rounded-xl bg-gray-50 p-4" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Así queda</p>
          {numOrNull(form.value) === null ? (
            <p className="mt-1 text-sm text-gray-500">Completá el descuento para ver el resumen.</p>
          ) : (
            <>
              <p className="mt-1 text-base font-semibold text-gray-900">
                <span className="font-mono">{form.code.trim().toUpperCase() || 'CÓDIGO'}</span> · {preview.headline}
              </p>
              {preview.conditions.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-gray-700">
                  {preview.conditions.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span aria-hidden className="text-gray-400">•</span> {c}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-gray-600">Sin condiciones: vale para cualquier compra.</p>
              )}
            </>
          )}
          {warnings.length > 0 && numOrNull(form.value) !== null && (
            <ul className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-sm text-amber-700">
              {warnings.map((w) => (
                <li key={w}>Ojo: {w}</li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {tried && errors.length > 0 && (
            <ul role="alert" className="mb-3 space-y-1 text-sm text-red-600">
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gray-900 px-5 text-sm font-bold text-white transition-colors hover:bg-gray-700 disabled:opacity-50">
            {!editingId && <Plus className="h-4 w-4" />}
            {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear cupón'}
          </button>
        </div>
      </form>

      {/* ── Lista ── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : codes.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Todavía no hay cupones. Creá el primero con el formulario de arriba.</p>
      ) : (
        <ul className="space-y-2">
          {codes.map((dc) => {
            const status = couponStatus(dc);
            const summary = couponSummary(dc, brandNames);
            const off = status !== 'active' && status !== 'scheduled';
            return (
              <li key={dc.id} className={cn('rounded-xl border bg-white p-4', editingId === dc.id ? 'border-gray-900' : 'border-gray-200')}>
                {/* Celular: los botones van debajo del texto, que si no queda en una columna angosta */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('font-mono text-base font-bold', off ? 'text-gray-400' : 'text-gray-900')}>{dc.code}</span>
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', STATUS[status].className)}>{STATUS[status].label}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900">{summary.headline}</p>
                    {summary.conditions.length > 0 && <p className="mt-0.5 text-sm text-gray-600">{summary.conditions.join(' · ')}</p>}
                    <p className="mt-1 text-xs text-gray-500">
                      {dc.used_count === 0 ? 'Sin usos todavía' : `${dc.used_count} ${dc.used_count === 1 ? 'uso' : 'usos'}`}
                      {dc.max_uses != null ? ` de ${dc.max_uses}` : ''}
                      {dc.note ? ` · ${dc.note}` : ''}
                    </p>
                  </div>
                  <div className="-ml-3 flex items-center gap-1 sm:ml-0">
                    <button onClick={() => edit(dc)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
                      <Pencil className="h-4 w-4" /> Editar
                    </button>
                    <button onClick={() => toggle(dc)} className="min-h-[44px] rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
                      {dc.active ? 'Pausar' : 'Activar'}
                    </button>
                    <button onClick={() => remove(dc)} aria-label={`Eliminar ${dc.code}`} className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CouponPopupSettings codes={codes} brandNames={brandNames} onChanged={load} />

      <p className="text-sm text-gray-500">
        El descuento se calcula sobre los productos, antes del recargo de tarjeta. El cliente carga el código en el resumen del pedido, en el checkout.
      </p>
    </div>
  );
}
