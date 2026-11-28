import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Costo y precio de mercado de los productos (tabla product_costs, solo admin:
 * supabase/migration-costos.sql). Se usan desde el panel con la sesión del admin.
 */

export interface ProductCost {
  product_id: string;
  cost_usd: number;
  market_price_usd: number | null;
  market_note: string | null;
  market_updated_at: string | null;
  updated_at?: string;
}

/** false si todavía no se corrió la migración */
export async function costsTableReady(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase.from('product_costs').select('product_id').limit(1);
  return !error;
}

export async function loadProductCost(supabase: SupabaseClient, productId: string): Promise<ProductCost | null> {
  const { data } = await supabase.from('product_costs').select('*').eq('product_id', productId).maybeSingle();
  return (data as ProductCost | null) ?? null;
}

export async function loadAllCosts(supabase: SupabaseClient): Promise<Record<string, ProductCost>> {
  const { data, error } = await supabase.from('product_costs').select('*').limit(2000);
  if (error) return {};
  return Object.fromEntries(((data ?? []) as ProductCost[]).map((c) => [c.product_id, c]));
}

/** Lo que se carga en el formulario, como texto */
export interface CostForm {
  cost: string;
  market: string;
  marketNote: string;
}

export const EMPTY_COST_FORM: CostForm = { cost: '', market: '', marketNote: '' };

export const costFormFrom = (c: ProductCost | null): CostForm =>
  c
    ? { cost: String(c.cost_usd), market: c.market_price_usd != null ? String(c.market_price_usd) : '', marketNote: c.market_note ?? '' }
    : EMPTY_COST_FORM;

/** Número positivo a partir de lo escrito (acepta coma decimal), o null */
export function positive(raw: string): number | null {
  const n = Number(String(raw).replace(',', '.').trim());
  return raw.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/** Motivo por el que el costo no sirve, o null si está bien */
export function costError(form: CostForm): string | null {
  if (!form.cost.trim()) return 'Cargá cuánto te costó el producto.';
  if (positive(form.cost) === null) return 'El costo tiene que ser un número mayor a 0.';
  if (form.market.trim() && positive(form.market) === null) return 'El precio de mercado tiene que ser un número mayor a 0.';
  return null;
}

export async function saveProductCost(
  supabase: SupabaseClient,
  productId: string,
  form: CostForm,
  previous: ProductCost | null
): Promise<{ error: string | null; saved: ProductCost | null }> {
  const cost = positive(form.cost);
  if (cost === null) return { error: 'Falta el costo.', saved: null };
  const market = positive(form.market);
  const now = new Date().toISOString();
  // La fecha del precio de mercado cambia solo si cambió el precio
  const marketChanged = market !== (previous?.market_price_usd != null ? Number(previous.market_price_usd) : null);
  const row: ProductCost = {
    product_id: productId,
    cost_usd: cost,
    market_price_usd: market,
    market_note: market ? form.marketNote.trim().slice(0, 120) || null : null,
    market_updated_at: market ? (marketChanged ? now : previous?.market_updated_at ?? now) : null,
    updated_at: now,
  };
  const { error } = await supabase.from('product_costs').upsert(row, { onConflict: 'product_id' });
  return { error: error ? error.message : null, saved: error ? null : row };
}
