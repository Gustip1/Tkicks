import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        // Sistema Apple: SF Pro gratis en Mac/iPhone, Inter (su sustituto canónico) en el resto
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'var(--font-sans)', 'Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        // Grises de Apple (apple.com). Reemplazan la escala de Tailwind para que
        // todo text-gray-* / bg-gray-* / border-gray-* ya existente hable el mismo idioma.
        gray: {
          50:  '#fafafc', // surfacePearl
          100: '#f5f5f7', // canvasParchment — el off-white de Apple
          200: '#e0e0e0', // hairline
          300: '#d2d2d7',
          400: '#a1a1a6',
          500: '#86868b',
          600: '#6e6e73',
          700: '#424245',
          800: '#333336',
          900: '#1d1d1f', // ink — el casi-negro de Apple
          950: '#000000',
        },
        // Definidos una sola vez, como CSS vars, en app/globals.css
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)'
        },
        accent: 'var(--color-accent)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          dark: 'var(--color-surface-dark)'
        },
        border: 'var(--color-border)'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.5' }
        }
      },
      animation: {
        marquee: 'marquee 20s linear infinite',
        fadeIn: 'fadeIn 0.5s ease-out forwards',
        slideIn: 'slideIn 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      // Escalera de pesos de Apple: 400 / 600 / 700. Las clases viejas (font-black,
      // font-extrabold, font-medium) se remapean acá para que todo el sitio la respete.
      fontWeight: {
        medium: '400',
        extrabold: '700',
        black: '700',
      },
      // Sin sombras de "chrome": Apple eleva con cambios de superficie y hairlines.
      // Se neutralizan las sombras de Tailwind; la única que queda es shadow-product,
      // la caída suave bajo una foto de producto.
      boxShadow: {
        sm: '0 0 #0000',
        DEFAULT: '0 0 #0000',
        md: '0 0 #0000',
        lg: '0 0 #0000',
        xl: '0 0 #0000',
        '2xl': '0 0 #0000',
        product: '0 24px 40px -24px rgba(0, 0, 0, 0.22)',
        soft: '0 0 #0000',
        medium: '0 0 #0000',
        strong: '0 0 #0000'
      },
      // Gramática de radios de Apple: sm 6 · md 10 · lg 14 (tarjetas) · xl 20 (superficies grandes)
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '14px',
        '2xl': '20px',
        '3xl': '20px'
      }
    }
  },
  plugins: []
};

export default config;
