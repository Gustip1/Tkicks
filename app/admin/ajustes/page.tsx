"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { revalidateHome } from '@/lib/admin/revalidateHome';

export default function AdminSettingsPage() {
  const [rate, setRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [installmentsPromoActive, setInstallmentsPromoActive] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const [instagramToken, setInstagramToken] = useState('');
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [instagramMessage, setInstagramMessage] = useState<string | null>(null);

  const [offersEnabled, setOffersEnabled] = useState(false);
  const [savingOffers, setSavingOffers] = useState(false);
  const [offersMessage, setOffersMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    const fetchRate = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'usd_ars_rate')
        .single();

      if (data) {
        setRate(Number(data.value));
      }
      setLoading(false);
    };
    void fetchRate();

    const fetchInstallmentsPromo = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'installments_promo')
        .maybeSingle();
      setInstallmentsPromoActive(Boolean((data?.value as { active?: boolean } | null)?.active));
    };
    void fetchInstallmentsPromo();

    const fetchInstagramToken = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'instagram_access_token')
        .maybeSingle();
      const value = data?.value as { token?: string } | null;
      if (value?.token) setInstagramToken(value.token);
    };
    void fetchInstagramToken();

    const fetchOffersEnabled = async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'offers_enabled')
        .maybeSingle();
      setOffersEnabled(Boolean((data?.value as { active?: boolean } | null)?.active));
    };
    void fetchOffersEnabled();
  }, []);

  const handleToggleInstallmentsPromo = async () => {
    const next = !installmentsPromoActive;
    setSavingPromo(true);
    setPromoMessage(null);
    const supabase = createBrowserClient();
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({ key: 'installments_promo', value: { active: next } }, { onConflict: 'key' });

    if (upsertError) {
      setPromoMessage(`Error al guardar: ${upsertError.message}`);
    } else {
      setInstallmentsPromoActive(next);
      setPromoMessage(next ? '✓ Promo activada — se muestra en toda la web' : '✓ Promo desactivada — vuelve el recargo del 10%');
      await revalidateHome();
    }
    setSavingPromo(false);
  };

  const handleToggleOffers = async () => {
    const next = !offersEnabled;
    setSavingOffers(true);
    setOffersMessage(null);
    const supabase = createBrowserClient();
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({ key: 'offers_enabled', value: { active: next } }, { onConflict: 'key' });

    if (upsertError) {
      setOffersMessage(`Error al guardar: ${upsertError.message}`);
    } else {
      setOffersEnabled(next);
      setOffersMessage(next ? '✓ Activado — aparece en cada producto' : '✓ Desactivado');
      await revalidateHome();
    }
    setSavingOffers(false);
  };

  const handleSaveInstagramToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInstagram(true);
    setInstagramMessage(null);
    const supabase = createBrowserClient();
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({ key: 'instagram_access_token', value: { token: instagramToken.trim() } }, { onConflict: 'key' });

    setInstagramMessage(
      upsertError ? `Error al guardar: ${upsertError.message}` : '✓ Token guardado — el feed de Instagram lo usa en la próxima carga'
    );
    if (!upsertError) await revalidateHome();
    setSavingInstagram(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createBrowserClient();
    const { error: updateError } = await supabase
      .from('settings')
      .update({ value: rate })
      .eq('key', 'usd_ars_rate');

    if (updateError) {
      setError('Error al guardar. Intenta de nuevo.');
    } else {
      setSuccess('Tipo de cambio guardado con éxito.');
      await revalidateHome();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ajustes Generales</h1>
      
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipo de Cambio</h2>
        <form onSubmit={handleSave} className="space-y-4 max-w-sm">
          <div>
            <label htmlFor="usd_ars_rate" className="block text-sm font-medium text-gray-700">
              Valor de 1 USD en ARS
            </label>
            <div className="mt-1">
              <input
                type="number"
                id="usd_ars_rate"
                name="usd_ars_rate"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                disabled={loading}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                step="0.01"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Este valor se usará para convertir los precios de USD a ARS en la tienda.
            </p>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
        </form>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Promo: 3 cuotas sin interés</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-lg">
          Cuando está activa, el pago en 3 cuotas con tarjeta no tiene el 10% de recargo (mismo precio que efectivo/transferencia)
          y se muestra el popup de la promo a todos los visitantes del sitio. Desactivala para volver al recargo normal.
        </p>
        <div className="flex items-center gap-3 max-w-sm">
          <button
            type="button"
            onClick={handleToggleInstallmentsPromo}
            disabled={savingPromo}
            role="switch"
            aria-checked={installmentsPromoActive}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              installmentsPromoActive ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                installmentsPromoActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {installmentsPromoActive ? 'Activa — sin recargo' : 'Inactiva — 10% de recargo'}
          </span>
        </div>
        {promoMessage && <p className="mt-3 text-sm text-gray-600">{promoMessage}</p>}
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ofertas (negociar precio)</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-lg">
          Cuando está activo, en cada producto aparece el botón &quot;Hacer una oferta&quot;: el cliente elige pesos o
          dólares, pone un monto y te llega el mensaje por WhatsApp para negociar. No crea ningún pedido.
        </p>
        <div className="flex items-center gap-3 max-w-sm">
          <button
            type="button"
            onClick={handleToggleOffers}
            disabled={savingOffers}
            role="switch"
            aria-checked={offersEnabled}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              offersEnabled ? 'bg-emerald-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                offersEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {offersEnabled ? 'Activo — visible en cada producto' : 'Inactivo'}
          </span>
        </div>
        {offersMessage && <p className="mt-3 text-sm text-gray-600">{offersMessage}</p>}
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Instagram (@tkicks.sj)</h2>
        <p className="text-sm text-gray-500 mb-4 max-w-lg">
          Pegá acá el access token de Instagram para mostrar tus últimos posts en la home. Se genera desde
          developers.facebook.com (producto &quot;Instagram API with Instagram Login&quot;) conectando tu cuenta profesional.
          El token de larga duración vence cada ~60 días — cuando venza, generá uno nuevo y pegalo acá de nuevo.
        </p>
        <form onSubmit={handleSaveInstagramToken} className="space-y-4 max-w-lg">
          <div>
            <label htmlFor="instagram_token" className="block text-sm font-medium text-gray-700">
              Access token
            </label>
            <div className="mt-1">
              <input
                type="password"
                id="instagram_token"
                name="instagram_token"
                value={instagramToken}
                onChange={(e) => setInstagramToken(e.target.value)}
                placeholder="IGQ..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={savingInstagram}
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {savingInstagram ? 'Guardando...' : 'Guardar token'}
            </button>
          </div>
          {instagramMessage && <p className="text-sm text-gray-600">{instagramMessage}</p>}
        </form>
      </div>
    </div>
  );
}
