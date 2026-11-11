"use client";
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, Lock } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  BillingAddress,
  CARD_BRAND_LABEL,
  CardInstallments,
  PROVINCES,
  canonicalProvince,
  cardBrandOf,
  cardLengths,
  cardTotalArs,
  formatCardNumber,
  luhnValid,
  parseExpiry,
  validPostalCode,
} from '@/lib/payments/card';
import type { PaywayPublicConfig } from '@/lib/payments/payway';

/**
 * Tarjeta de crédito con Payway. Los datos de la tarjeta van del navegador
 * directo a Payway (decidir.js) y vuelve un token de un solo uso: eso es lo
 * único que recibe nuestro servidor. Cuotas: 1 pago sin recargo; 3 cuotas con
 * 10% o sin recargo si la promo está activa (lib/payments/card.ts).
 */

declare global {
  interface Window {
    Decidir?: new (url: string, disableCybersource?: boolean) => DecidirClient;
  }
}

interface DecidirClient {
  /** Lo arma decidir.js con el control de fraude prendido: viaja en el token y en el cobro */
  device_unique_identifier?: string;
  setPublishableKey(key: string): void;
  setTimeout(ms: number): void;
  createToken(form: HTMLFormElement, cb: (status: number, response: any) => void): void;
}

export interface CardToken {
  token: string;
  bin: string;
  lastFour: string;
  deviceId: string | null;
  /** null = la misma que la de envío */
  billing: BillingAddress | null;
}

let decidirScript: Promise<void> | null = null;

/** Carga decidir.js una sola vez, recién cuando el cliente elige tarjeta */
function loadDecidir(src: string): Promise<void> {
  if (typeof window !== 'undefined' && window.Decidir) return Promise.resolve();
  if (decidirScript) return decidirScript;
  decidirScript = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => (window.Decidir ? resolve() : reject(new Error('decidir.js sin Decidir')));
    s.onerror = () => reject(new Error('No cargó decidir.js'));
    document.head.appendChild(s);
  }).catch((err) => {
    decidirScript = null;
    throw err;
  });
  return decidirScript;
}

type Field = 'number' | 'expiry' | 'cvv' | 'name' | 'doc' | 'street' | 'postalCode' | 'city' | 'province';

/** Errores de validación de decidir.js → campo del formulario */
const DECIDIR_FIELD: Record<string, Field> = {
  empty_card_number: 'number',
  invalid_card_number: 'number',
  invalid_expiry_date: 'expiry',
  invalid_security_code: 'cvv',
  empty_card_holder_name: 'name',
  invalid_card_holder_doc_number: 'doc',
  invalid_card_holder_doc_type: 'doc',
};

export function CardPayment({
  config,
  subtotalUsd,
  installments,
  onInstallmentsChange,
  promoOn,
  dollarRate,
  rateReady,
  defaultName,
  defaultDocument,
  shippingAddress,
  submitting,
  error,
  onToken,
}: {
  config: PaywayPublicConfig;
  /** En dólares, con el cupón ya descontado */
  subtotalUsd: number;
  installments: CardInstallments;
  onInstallmentsChange: (n: CardInstallments) => void;
  promoOn: boolean;
  dollarRate: number;
  rateReady: boolean;
  defaultName: string;
  defaultDocument: string;
  /** La de envío, para ofrecerla como facturación; null si retira en el showroom */
  shippingAddress: BillingAddress | null;
  submitting: boolean;
  /** Error del cobro (rechazo del banco, precio que cambió): se muestra arriba del botón */
  error: string | null;
  onToken: (card: CardToken) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState(defaultName);
  const [doc, setDoc] = useState(defaultDocument);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  // Facturación como en Shopify: igual que la de envío, o una distinta
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billing, setBilling] = useState<BillingAddress>({ street: '', postalCode: '', city: '', province: '' });
  const [sdkState, setSdkState] = useState<'loading' | 'ready' | 'error'>('loading');
  const decidirRef = useRef<DecidirClient | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadDecidir(config.scriptUrl)
      .then(() => {
        if (!alive || !window.Decidir) return;
        // Se crea apenas aparece el formulario: con el control de fraude prendido,
        // decidir.js arma la huella del dispositivo mientras el cliente escribe
        const decidir = new window.Decidir(config.apiUrl, !config.cybersource);
        decidir.setPublishableKey(config.publicKey);
        decidir.setTimeout(config.cybersource ? 20000 : 10000);
        decidirRef.current = decidir;
        setSdkState('ready');
      })
      .catch(() => alive && setSdkState('error'));
    return () => {
      alive = false;
    };
  }, [config.scriptUrl, config.apiUrl, config.publicKey, config.cybersource]);

  // Después de un rechazo se pide el código de nuevo (el token ya se usó)
  useEffect(() => {
    if (error) setCvv('');
  }, [error]);

  const digits = number.replace(/\D/g, '');
  const brand = cardBrandOf(digits);
  const lengths = cardLengths(brand);
  const brandAccepted = !brand || config.brands.includes(brand);
  const exp = parseExpiry(expiry);

  const total1 = cardTotalArs(subtotalUsd, 1, promoOn, dollarRate);
  const total3 = cardTotalArs(subtotalUsd, 3, promoOn, dollarRate);
  const total = installments === 3 ? total3 : total1;
  const busy = submitting || tokenizing;
  // Con retiro en el showroom no hay dirección de envío: se pide la de facturación
  const shippingUsable = !!shippingAddress && !!canonicalProvince(shippingAddress.province);
  const needsBilling = !shippingUsable || !sameAsShipping;

  const validate = (): boolean => {
    const e: Partial<Record<Field, string>> = {};
    if (!digits) e.number = 'Ingresá el número de la tarjeta';
    else if (!brand || !brandAccepted) e.number = `Aceptamos ${config.brands.map((b) => CARD_BRAND_LABEL[b]).join(', ')} de crédito`;
    else if (digits.length !== lengths.number || !luhnValid(digits)) e.number = 'Revisá el número de la tarjeta';
    if (!expiry.trim()) e.expiry = 'Ingresá el vencimiento';
    else if (!exp) e.expiry = 'Vencimiento inválido';
    if (cvv.length !== lengths.cvv) e.cvv = `Son ${lengths.cvv} números`;
    if (!name.trim()) e.name = 'Ingresá el nombre como figura en la tarjeta';
    if (!/^\d{7,8}$/.test(doc.replace(/\D/g, ''))) e.doc = 'Ingresá el DNI del titular';
    if (needsBilling) {
      if (!billing.street.trim()) e.street = 'Ingresá la calle y el número';
      if (!validPostalCode(billing.postalCode)) e.postalCode = 'Código postal inválido';
      if (!billing.city.trim()) e.city = 'Ingresá la localidad';
      if (!billing.province) e.province = 'Elegí la provincia';
    }
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => {
        const first = formRef.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]');
        first?.focus();
      });
      return false;
    }
    return true;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!validate()) return;
    if (!rateReady) {
      setFormError('Estamos actualizando el precio en pesos. Probá de nuevo en un segundo.');
      return;
    }
    const decidir = decidirRef.current;
    if (sdkState !== 'ready' || !decidir || !formRef.current) {
      setFormError('No pudimos conectar con Payway. Revisá tu conexión y probá de nuevo.');
      return;
    }

    setTokenizing(true);
    decidir.createToken(formRef.current, (status, response) => {
      setTokenizing(false);
      if ((status === 200 || status === 201) && response?.id) {
        onToken({
          token: String(response.id),
          bin: String(response.bin ?? digits.slice(0, 6)),
          lastFour: String(response.last_four_digits ?? digits.slice(-4)),
          deviceId: config.cybersource ? decidir.device_unique_identifier ?? null : null,
          billing: needsBilling
            ? { ...billing, street: billing.street.trim(), city: billing.city.trim(), postalCode: billing.postalCode.trim() }
            : null,
        });
        return;
      }
      // Validación de decidir.js: {error: [{error: {type, message, param}}]}
      const list: any[] = Array.isArray(response?.error) ? response.error : [];
      const fieldErrors: Partial<Record<Field, string>> = {};
      for (const item of list) {
        const field = DECIDIR_FIELD[item?.error?.type];
        if (field) fieldErrors[field] = field === 'expiry' ? 'Vencimiento inválido' : 'Revisá este dato';
      }
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        return;
      }
      setFormError(
        status === 0 || status >= 500
          ? 'No pudimos conectar con Payway. Revisá tu conexión y probá de nuevo.'
          : 'Revisá los datos de la tarjeta y probá de nuevo.'
      );
    });
  };

  const options: { n: CardInstallments; title: string; amount: string; note: string }[] = [
    { n: 1, title: '1 pago', amount: formatCurrency(total1), note: 'Sin recargo' },
    {
      n: 3,
      title: '3 cuotas',
      amount: `3 × ${formatCurrency(total3 / 3)}`,
      note: promoOn ? `Sin interés · Total ${formatCurrency(total3)}` : `10% de recargo · Total ${formatCurrency(total3)}`,
    },
  ];

  const message = formError || error;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      {config.sandbox && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-600">
          Modo de prueba de Payway: no se cobra nada. Tarjeta de prueba 4507 9900 0000 4905.
        </p>
      )}

      <fieldset>
        <legend className="text-sm font-black text-gray-900">¿En cuántos pagos?</legend>
        <div role="radiogroup" aria-label="Cantidad de pagos" className="mt-2.5 grid grid-cols-2 gap-2">
          {options.map((o) => (
            <button
              key={o.n}
              type="button"
              role="radio"
              aria-checked={installments === o.n}
              disabled={busy}
              onClick={() => onInstallmentsChange(o.n)}
              className={cn(
                'min-h-[76px] rounded-xl border bg-white px-3 py-2.5 text-left transition-[border-color,box-shadow] duration-150 active:scale-[0.98] disabled:opacity-60',
                installments === o.n
                  ? 'border-transparent ring-2 ring-primary'
                  : 'border-gray-200 hover:border-gray-400'
              )}
            >
              <span className="block text-[13px] font-semibold text-gray-600">{o.title}</span>
              <span className={cn('block text-[17px] font-semibold text-gray-900', !rateReady && 'invisible')}>{o.amount}</span>
              <span className={cn('block text-[12px] text-gray-500', !rateReady && 'invisible')}>{o.note}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <CardField
          label="Número de la tarjeta"
          value={number}
          onChange={(v) => {
            setNumber(formatCardNumber(v));
            setErrors((e) => ({ ...e, number: undefined }));
          }}
          error={errors.number}
          autoComplete="cc-number"
          inputMode="numeric"
          placeholder="0000 0000 0000 0000"
          trailing={brand ? CARD_BRAND_LABEL[brand] : undefined}
        />
        <div className="grid grid-cols-2 gap-3">
          <CardField
            label="Vencimiento"
            value={expiry}
            onChange={(v) => {
              const d = v.replace(/\D/g, '').slice(0, 4);
              setExpiry(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
              setErrors((e) => ({ ...e, expiry: undefined }));
            }}
            error={errors.expiry}
            autoComplete="cc-exp"
            inputMode="numeric"
            placeholder="MM/AA"
          />
          <CardField
            label="Código de seguridad"
            value={cvv}
            onChange={(v) => {
              setCvv(v.replace(/\D/g, '').slice(0, lengths.cvv));
              setErrors((e) => ({ ...e, cvv: undefined }));
            }}
            error={errors.cvv}
            autoComplete="cc-csc"
            inputMode="numeric"
            placeholder={brand === 'amex' ? '4 números' : '3 números'}
          />
        </div>
        <CardField
          label="Nombre como figura en la tarjeta"
          value={name}
          onChange={(v) => {
            setName(v);
            setErrors((e) => ({ ...e, name: undefined }));
          }}
          error={errors.name}
          autoComplete="cc-name"
        />
        <CardField
          label="DNI del titular"
          value={doc}
          onChange={(v) => {
            setDoc(v.replace(/\D/g, '').slice(0, 8));
            setErrors((e) => ({ ...e, doc: undefined }));
          }}
          error={errors.doc}
          inputMode="numeric"
        />
      </div>

      {/* Dirección de facturación: la pide el control de fraude de Payway */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-black text-gray-900">Dirección de facturación</legend>
        {shippingUsable ? (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            {[
              { same: true, label: 'Igual que la dirección de envío' },
              { same: false, label: 'Usar otra dirección' },
            ].map((o, i) => (
              <label
                key={String(o.same)}
                className={cn(
                  'flex min-h-[52px] cursor-pointer items-center gap-3 px-4 text-[15px] text-gray-900',
                  i > 0 && 'border-t border-gray-200',
                  sameAsShipping === o.same && 'bg-gray-50'
                )}
              >
                <input
                  type="radio"
                  name="billing-same"
                  checked={sameAsShipping === o.same}
                  onChange={() => setSameAsShipping(o.same)}
                  disabled={busy}
                  className="h-[18px] w-[18px] accent-[var(--color-pricing)]"
                />
                {o.label}
              </label>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-gray-500">La del resumen de tu tarjeta. La pide el banco para validar el pago.</p>
        )}
        {needsBilling && (
          <div className="space-y-1">
            <CardField
              label="Calle y número"
              value={billing.street}
              onChange={(v) => {
                setBilling((b) => ({ ...b, street: v }));
                setErrors((e) => ({ ...e, street: undefined }));
              }}
              error={errors.street}
              autoComplete="billing street-address"
            />
            <div className="grid grid-cols-2 gap-3">
              <CardField
                label="Código postal"
                value={billing.postalCode}
                onChange={(v) => {
                  setBilling((b) => ({ ...b, postalCode: v.toUpperCase().slice(0, 8) }));
                  setErrors((e) => ({ ...e, postalCode: undefined }));
                }}
                error={errors.postalCode}
                autoComplete="billing postal-code"
              />
              <CardField
                label="Localidad"
                value={billing.city}
                onChange={(v) => {
                  setBilling((b) => ({ ...b, city: v }));
                  setErrors((e) => ({ ...e, city: undefined }));
                }}
                error={errors.city}
                autoComplete="billing address-level2"
              />
            </div>
            <ProvinceSelect
              value={billing.province}
              onChange={(v) => {
                setBilling((b) => ({ ...b, province: v }));
                setErrors((e) => ({ ...e, province: undefined }));
              }}
              error={errors.province}
              autoComplete="billing address-level1"
            />
          </div>
        )}
      </fieldset>

      {/* Lo que lee decidir.js: valores ya limpios */}
      <input type="hidden" data-decidir="card_number" value={digits} readOnly />
      <input type="hidden" data-decidir="card_expiration_month" value={exp?.month ?? ''} readOnly />
      <input type="hidden" data-decidir="card_expiration_year" value={exp?.year ?? ''} readOnly />
      <input type="hidden" data-decidir="security_code" value={cvv} readOnly />
      <input type="hidden" data-decidir="card_holder_name" value={name.trim()} readOnly />
      <input type="hidden" data-decidir="card_holder_doc_type" value="dni" readOnly />
      <input type="hidden" data-decidir="card_holder_doc_number" value={doc.replace(/\D/g, '')} readOnly />

      {message && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
          <p className="text-sm font-bold text-red-600">{message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={busy || sdkState === 'loading'}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-pricing py-4 text-sm font-normal text-white transition-colors hover:bg-pricing-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
            Procesando el pago…
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" aria-hidden />
            <span className={cn(!rateReady && 'invisible')}>
              Pagar {formatCurrency(total)}
              {installments === 3 ? ' en 3 cuotas' : ''}
            </span>
          </>
        )}
      </button>

      <p className="flex items-start gap-2 text-[12px] text-gray-500">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Los datos de la tarjeta van directo a Payway. Tkicks no los ve ni los guarda.
      </p>
      {sdkState === 'error' && (
        <p className="text-[12px] font-bold text-red-600">
          No pudimos cargar el pago con tarjeta. Revisá tu conexión y recargá la página, o elegí otro medio de pago.
        </p>
      )}
    </form>
  );
}

function CardField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  inputMode,
  placeholder,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text';
  placeholder?: string;
  trailing?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-gray-600">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          autoComplete={autoComplete}
          inputMode={inputMode}
          placeholder={placeholder}
          autoCorrect="off"
          spellCheck={false}
          className={cn(
            'w-full rounded-md border bg-white px-4 py-3 text-[17px] text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none',
            trailing && 'pr-24',
            error ? 'border-red-500' : 'border-gray-200 focus:border-primary'
          )}
        />
        {trailing && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[13px] font-semibold text-gray-600">
            {trailing}
          </span>
        )}
      </div>
      <p id={`${id}-error`} className={cn('mt-1 min-h-[1rem] text-xs text-red-600', !error && 'invisible')}>
        {error || ' '}
      </p>
    </div>
  );
}

/** Provincia de una lista: Payway necesita su código, y escrita a mano no siempre se reconoce */
export function ProvinceSelect({
  value,
  onChange,
  error,
  label = 'Provincia',
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  label?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-gray-600">
        {label}
      </label>
      <div className="relative">
      <select
        id={id}
        value={canonicalProvince(value) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        autoComplete={autoComplete}
        className={cn(
          'w-full appearance-none rounded-md border bg-white py-3 pl-4 pr-10 text-[17px] transition-colors focus:outline-none',
          canonicalProvince(value) ? 'text-gray-900' : 'text-gray-400',
          error ? 'border-red-500' : 'border-gray-200 focus:border-primary'
        )}
      >
        <option value="" disabled>
          Elegí la provincia
        </option>
        {PROVINCES.map((p) => (
          <option key={p.code} value={p.name} className="text-gray-900">
            {p.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
      </div>
      <p id={`${id}-error`} className={cn('mt-1 min-h-[1rem] text-xs text-red-600', !error && 'invisible')}>
        {error || ' '}
      </p>
    </div>
  );
}
