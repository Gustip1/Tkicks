import { SupabaseClient } from '@supabase/supabase-js';
import type { DiscountCode } from '@/types/db';
import { CouponItem, CouponResult, evaluateCoupon } from '@/lib/coupons';

/**
 * La parte de los cupones que necesita la base: buscar el cupón, los nombres
 * de las marcas y si el cliente ya compró o ya lo usó. Siempre con el cliente
 * de service role (la tabla de cupones no es pública).
 */

export async function findCoupon(supabase: SupabaseClient, code: string): Promise<DiscountCode | null> {
  // "*": las columnas de condiciones pueden no existir todavía (migración pendiente)
  const { data } = await supabase.from('discount_codes').select('*').eq('code', code.trim().toUpperCase()).maybeSingle();
  return (data as DiscountCode | null) ?? null;
}

/** slug → nombre, solo de las marcas que nombra el cupón (para los mensajes) */
async function brandNames(supabase: SupabaseClient, coupon: DiscountCode): Promise<Record<string, string>> {
  const slugs = Array.isArray(coupon.applies_brands) ? coupon.applies_brands.filter(Boolean) : [];
  if (slugs.length === 0) return {};
  const { data } = await supabase.from('brands').select('name, slug').in('slug', slugs);
  return Object.fromEntries((data ?? []).map((b: any) => [b.slug, b.name]));
}

export interface CouponCustomer {
  email?: string | null;
  document?: string | null;
}

/**
 * Condiciones que dependen de quién compra. Devuelve el motivo si el cupón no
 * le corresponde, o null. Se busca por email y por documento: cambiar uno
 * solo no alcanza para volver a usarlo.
 */
async function customerBlock(supabase: SupabaseClient, coupon: DiscountCode, customer: CouponCustomer): Promise<string | null> {
  if (!coupon.once_per_customer && !coupon.first_purchase_only) return null;

  const email = customer.email?.trim().toLowerCase() || null;
  const document = customer.document?.trim() || null;
  const identities: [string, string][] = [];
  if (email) identities.push(['email', email]);
  if (document) identities.push(['document', document]);
  // Todavía no cargó sus datos: se vuelve a revisar al confirmar el pedido
  if (identities.length === 0) return null;

  const exists = async (build: (q: any) => any) => {
    for (const [column, value] of identities) {
      const { data } = await build(supabase.from('orders').select('id').eq(column, value)).limit(1);
      if (data && data.length > 0) return true;
    }
    return false;
  };

  if (coupon.once_per_customer) {
    // Cuenta también los pedidos sin pagar todavía; los cancelados no
    const used = await exists((q) => q.eq('discount_code', coupon.code).neq('status', 'cancelled'));
    if (used) return 'Ya usaste este cupón en otra compra';
  }

  if (coupon.first_purchase_only) {
    const bought = await exists((q) => q.in('status', ['paid', 'fulfilled']));
    if (bought) return 'Este cupón vale solo para la primera compra';
  }

  return null;
}

/** Evalúa el cupón completo: reglas del carrito y del cliente. No consume el uso. */
export async function checkCoupon(
  supabase: SupabaseClient,
  coupon: DiscountCode,
  ctx: { items: CouponItem[]; paymentMethod?: string | null; customer?: CouponCustomer }
): Promise<CouponResult> {
  const result = evaluateCoupon(coupon, { items: ctx.items, paymentMethod: ctx.paymentMethod }, await brandNames(supabase, coupon));
  if (!result.ok) return result;
  const blocked = await customerBlock(supabase, coupon, ctx.customer ?? {});
  return blocked ? { ok: false, reason: blocked } : result;
}
