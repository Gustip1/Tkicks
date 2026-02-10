export type ProductCategory = 'sneakers' | 'streetwear';

export type StreetWearSubcategory = 'remeras' | 'hoodies' | 'pantalones';

export const STREETWEAR_SUBCATEGORIES: { value: StreetWearSubcategory; label: string; icon: string }[] = [
  { value: 'remeras', label: 'Remeras', icon: '👕' },
  { value: 'hoodies', label: 'Hoodies / Abrigos', icon: '🧥' },
  { value: 'pantalones', label: 'Pantalones', icon: '👖' },
];

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
  price: number;
  description: string | null;
  images: ProductImage[];
  featured_sneakers: boolean;
  featured_streetwear: boolean;
  on_sale: boolean;
  // Flag para controlar manualmente si aparece en \"Nuevos ingresos\"
  is_new?: boolean | null;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
}



