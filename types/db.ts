export type ProductCategory = 'sneakers' | 'streetwear';

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
  price: number;
  description: string | null;
  images: ProductImage[];
  featured_sneakers: boolean;
  featured_streetwear: boolean;
  active: boolean;
  created_at: string | null;
  updated_at: string | null;
}



