export type ProductCategory = 'sneakers' | 'streetwear';

export type StreetWearSubcategory = 'remeras' | 'hoodies' | 'sweaters' | 'zip-hoodies' | 'pantalones' | 'accesorios';

/** Grupos del menú, del catálogo (?sub=…) y de la portada */
export const STREETWEAR_SUBCATEGORIES: { value: StreetWearSubcategory; label: string; icon: string }[] = [
  { value: 'remeras', label: 'Remeras', icon: '👕' },
  { value: 'hoodies', label: 'Hoodies / Abrigos', icon: '🧥' },
  { value: 'pantalones', label: 'Pantalones', icon: '👖' },
  { value: 'accesorios', label: 'Accesorios', icon: '🧢' },
];

/**
 * Tipos dentro de "Hoodies / Abrigos" (oct 2026). El grupo usa la clave
 * 'hoodies', que es también la del primer tipo: lo que se cargó antes como
 * hoodie sigue en su lugar. En el catálogo se filtran con ?tipo=….
 * El tipo decide además el dibujo de la guía de talles.
 */
export const HOODIE_TYPES: { value: StreetWearSubcategory; label: string }[] = [
  { value: 'hoodies', label: 'Hoodies' },
  { value: 'sweaters', label: 'Sweaters' },
  { value: 'zip-hoodies', label: 'Zip hoodies' },
];

/** Las subcategorías que entran en un grupo del menú */
export function subcategoriesOf(group: StreetWearSubcategory): StreetWearSubcategory[] {
  return group === 'hoodies' ? HOODIE_TYPES.map((t) => t.value) : [group];
}

/** El grupo del menú de una subcategoría ('sweaters' → 'hoodies') */
export function groupOf(sub: string | null | undefined): StreetWearSubcategory | null {
  if (!sub) return null;
  if (HOODIE_TYPES.some((t) => t.value === sub)) return 'hoodies';
  return (STREETWEAR_SUBCATEGORIES.find((g) => g.value === sub)?.value ?? null);
}

/** Nombre para mostrar: el tipo si es de Hoodies ("Sweaters"), si no el grupo */
export function subcategoryLabel(sub: string | null | undefined): string {
  if (!sub) return '';
  return HOODIE_TYPES.find((t) => t.value === sub)?.label ?? STREETWEAR_SUBCATEGORIES.find((g) => g.value === sub)?.label ?? sub;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  stock: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  category: ProductCategory;
  subcategory: StreetWearSubcategory | null;
  brand?: string | null;
  price: number;
  sale_price?: number | null;
  description: string | null;
  images: ProductImage[];
  featured_sneakers: boolean;
  featured_streetwear: boolean;
  on_sale: boolean;
  /** Flag para controlar manualmente si aparece en "Nuevos ingresos" */
  is_new?: boolean | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
  /** Guía de talles { rows: [{ size, largo, ancho }] } en cm — leer siempre con parseSizeGuide (lib/sizeGuide). Null o ausente si no se cargó (o si falta la migración) */
  size_guide?: unknown | null;
  /** Joined from product_variants when using select('*, product_variants(stock,size)') */
  product_variants?: { stock: number; size?: string }[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  created_at: string;
}

export type DiscountType = 'percent' | 'fixed';

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
}

/* ────────────── Orders ────────────── */

export type OrderStatus = 'draft' | 'paid' | 'fulfilled' | 'cancelled';
export type FulfillmentMethod = 'pickup' | 'shipping';
export type PaymentMethod = 'cash' | 'crypto_transfer' | 'installments_3';

export interface Order {
  id: string;
  user_id: string | null;
  order_number: string | null;
  status: OrderStatus;
  fulfillment: FulfillmentMethod;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  subtotal: number;
  discount_code: string | null;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  payment_method: PaymentMethod | string | null;
  payment_status: string | null;
  payment_alias: string | null;
  payment_proof_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  title: string;
  slug: string;
  price: number;
  size: string;
  quantity: number;
}

export interface ShippingAddress {
  id: string;
  order_id: string;
  street: string | null;
  number: string | null;
  unit: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  notes: string | null;
}

/* ────────────── Auctions ────────────── */

export type AuctionStatus = 'active' | 'ended' | 'cancelled' | 'paid';

export interface Auction {
  id: string;
  product_id: string;
  variant_id: string;
  starting_price: number;
  current_price: number;
  min_increment: number;
  status: AuctionStatus;
  start_at: string;
  end_at: string;
  anti_snipe_window_seconds: number;
  anti_snipe_extend_seconds: number;
  winner_user_id: string | null;
  winner_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

/** Resultado del RPC list_active_auctions */
export interface ActiveAuctionRow {
  id: string;
  product_id: string;
  variant_id: string;
  product_title: string;
  product_slug: string;
  product_image: string;
  size: string;
  starting_price: number;
  current_price: number;
  min_increment: number;
  start_at: string;
  end_at: string;
  bid_count: number;
  top_bidder_alias?: string | null;
}



