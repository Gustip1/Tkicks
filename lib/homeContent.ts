/**
 * Tipos y valores por defecto del contenido editable del home (hero, cómo comprar,
 * social proof, banner promocional). Vive fuera de los componentes "use client"
 * para poder importarse tanto desde el server component (app/page.tsx) como
 * desde las páginas de admin sin cruzar el boundary cliente/servidor de RSC.
 */

export interface HeroContent {
  badge: string;
  headlinePre: string;
  headlineHighlight: string;
  headlinePost: string;
  subtitlePre: string;
  subtitleBold: string;
  subtitlePost: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  trustPill1: string;
  trustPill2: string;
}

export const DEFAULT_HERO_CONTENT: HeroContent = {
  badge: 'Stock exclusivo · San Juan',
  headlinePre: 'Sneakers ',
  headlineHighlight: '& Streetwear',
  headlinePost: ' originales.',
  subtitlePre: 'Selección curada de lo que está de moda. ',
  subtitleBold: '100% originales',
  subtitlePost: ', envíos a todo el país.',
  ctaPrimaryLabel: 'Ver catálogo',
  ctaPrimaryHref: '/productos',
  ctaSecondaryLabel: 'Ofertas',
  ctaSecondaryHref: '/ofertas',
  trustPill1: 'Originales garantizados',
  trustPill2: 'Envíos a todo el país',
};

export interface HowToBuyStep {
  title: string;
  desc: string;
  icon: string;
}

export interface HowToBuyContent {
  steps: HowToBuyStep[];
  whatsappNumber: string;
  whatsappMessage: string;
}

export const DEFAULT_HOW_TO_BUY_CONTENT: HowToBuyContent = {
  steps: [
    {
      title: 'Elegís tu producto',
      desc: 'Navegá el catálogo, seleccioná el modelo y la talla que querés.',
      icon: '👟',
    },
    {
      title: 'Pagás con el método que prefieras',
      desc: 'Transferencia, efectivo o 3 cuotas sin interés con tarjeta.',
      icon: '💳',
    },
    {
      title: 'Lo recibís en tu puerta',
      desc: 'Enviamos a todo el país. También podés pasar a retirar en San Juan.',
      icon: '📦',
    },
  ],
  whatsappNumber: '5492644802994',
  whatsappMessage: 'Hola, tengo una consulta sobre un producto',
};

export interface SocialProofItem {
  value: string;
  label: string;
}

export interface SocialProofContent {
  items: SocialProofItem[];
}

export const DEFAULT_SOCIAL_PROOF_CONTENT: SocialProofContent = {
  items: [
    { value: 'San Juan', label: 'Showroom físico' },
    { value: '100%', label: 'Originales' },
    { value: 'Únicos', label: 'y exclusivos' },
    { value: 'Comunidad', label: 'Tkicks fam' },
  ],
};

export interface PromoBannerContent {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
}

export const DEFAULT_PROMO_BANNER_CONTENT: PromoBannerContent = {
  enabled: false,
  eyebrow: 'Próximo evento',
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaHref: '',
};

export interface InstallmentsPromoContent {
  /** Si está activo, las 3 cuotas no tienen recargo (y se muestra el popup en todo el sitio). */
  active: boolean;
}

export const DEFAULT_INSTALLMENTS_PROMO_CONTENT: InstallmentsPromoContent = {
  active: false,
};
