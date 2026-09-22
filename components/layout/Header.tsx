"use client";
import Link from 'next/link';
import Image from 'next/image';
// Import estático: la URL lleva un hash del contenido, así el logo nuevo
// nunca queda tapado por el viejo en la caché del navegador.
import logo from '@/public/logo.jpg';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Menu, Search as SearchIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useUIStore } from '@/store/ui';
import { useCartStore } from '@/store/cart';
import { cn } from '@/lib/utils';
import { BannerTicker } from './BannerTicker';
import { STREETWEAR_SUBCATEGORIES, Brand } from '@/types/db';

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCart = useUIStore((s) => s.openCart);
  const cartItems = useCartStore((s) => s.items);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  // Panel desplegable a todo el ancho, como el de apple.com
  const [menu, setMenu] = useState<null | 'marcas' | 'streetwear'>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isInAdmin = pathname.startsWith('/admin');

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user: authUser }
      } = await supabase.auth.getUser();
      if (!authUser) {
        if (!cancelled) {
          setIsAdmin(false);
          setUser(null);
        }
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single();
      if (!cancelled) {
        setIsAdmin(profile?.role === 'admin');
        setUser(authUser);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cargamos las marcas activas para el megamenú de "Marcas"
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('active', true)
        .order('name');
      if (!cancelled && data) setBrands(data as Brand[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Cerramos el panel al navegar
  useEffect(() => {
    setMenu(null);
  }, [pathname]);

  if (isInAdmin) return null;

  const navLink =
    'px-2.5 2xl:px-3 py-2 text-xs font-normal text-white/80 hover:text-white transition-colors duration-200 whitespace-nowrap';

  return (
    <>
      <header
        className="sticky top-0 z-40 bg-black text-white pt-[env(safe-area-inset-top)]"
        onMouseLeave={() => setMenu(null)}
      >
        {/* Barra global: 48px, negra translúcida, links de 12px — la nav de apple.com */}
        <div className="relative h-12 px-2 md:px-6 flex items-center justify-between max-w-[1440px] mx-auto">
          {/* Izquierda - menú móvil + navegación */}
          <div className="flex items-center gap-1 min-w-0">
            <button
              onClick={toggleSidebar}
              className="inline-flex items-center justify-center rounded-full p-3 min-h-[44px] min-w-[44px] text-white/80 hover:text-white xl:hidden transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>

            <nav className="hidden xl:flex items-center">
              <Link href="/nuevos-ingresos" className={navLink} onMouseEnter={() => setMenu(null)}>
                Nuevos ingresos
              </Link>

              {brands.length > 0 && (
                <button
                  type="button"
                  className={cn(navLink, menu === 'marcas' && 'text-white')}
                  onMouseEnter={() => setMenu('marcas')}
                  onClick={() => setMenu((m) => (m === 'marcas' ? null : 'marcas'))}
                  aria-expanded={menu === 'marcas'}
                  aria-haspopup="true"
                >
                  Marcas
                </button>
              )}

              <Link href="/productos?sneakers" className={navLink} onMouseEnter={() => setMenu(null)}>
                Sneakers
              </Link>

              <Link
                href="/productos?streetwear"
                className={cn(navLink, menu === 'streetwear' && 'text-white')}
                onMouseEnter={() => setMenu('streetwear')}
                onFocus={() => setMenu('streetwear')}
                aria-haspopup="true"
              >
                Streetwear
              </Link>

              <Link href="/ofertas" className={navLink} onMouseEnter={() => setMenu(null)}>
                Ofertas
              </Link>
              <Link href="/subastas" className={navLink} onMouseEnter={() => setMenu(null)}>
                Subastas
              </Link>
              <Link href="/encargos" className={navLink} onMouseEnter={() => setMenu(null)}>
                Encargos
              </Link>
              <Link href="/nosotros" className={navLink} onMouseEnter={() => setMenu(null)}>
                Nosotros
              </Link>
            </nav>
          </div>

          {/* Centro - Logo. El JPG es negro sobre blanco: invertido queda blanco sobre
              negro, el mismo negro de la barra, así que el fondo no se ve. */}
          <div className="mx-auto min-[1280px]:mx-0 min-[1280px]:pointer-events-none min-[1280px]:absolute min-[1280px]:inset-0 min-[1280px]:flex min-[1280px]:items-center min-[1280px]:justify-center">
            <Link
              href="/"
              className="pointer-events-auto flex items-center shrink-0 px-2"
              aria-label="Inicio"
              onMouseEnter={() => setMenu(null)}
            >
              <Image src={logo} alt="Tkicks" priority className="h-8 w-auto invert" />
            </Link>
          </div>

          {/* Derecha - Buscar y acciones */}
          <div className="flex items-center gap-1 md:gap-1.5 shrink-0" onMouseEnter={() => setMenu(null)}>
            <form
              className="relative hidden lg:block"
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                if (!q) return router.push('/productos');
                router.push(`/productos?q=${encodeURIComponent(q)}`);
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en Tkicks"
                aria-label="Buscar productos"
                className="h-8 w-36 xl:w-44 rounded-full bg-white/10 pl-8 pr-3 text-xs text-white placeholder-white/50 transition-[width,background-color] duration-300 ease-apple focus:w-64 focus:bg-white/15 focus:outline-none"
              />
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/60" />
            </form>

            <button
              onClick={() => setShowSearch(!showSearch)}
              className="lg:hidden inline-flex items-center justify-center rounded-full p-3 min-h-[44px] min-w-[44px] text-white/80 hover:text-white transition-colors"
              aria-label="Buscar"
            >
              {showSearch ? <X className="h-5 w-5" /> : <SearchIcon className="h-5 w-5" />}
            </button>

            {isAdmin && (
              <Link href="/admin" className={cn(navLink, 'hidden sm:flex')}>
                Admin
              </Link>
            )}

            {!isAdmin && !user && (
              <Link href="/login" className={cn(navLink, 'hidden sm:flex')}>
                Ingresar
              </Link>
            )}

            <button
              className="relative inline-flex items-center justify-center rounded-full p-3 min-h-[44px] min-w-[44px] text-white/80 hover:text-white transition-colors"
              aria-label="Abrir carrito"
              onClick={openCart}
            >
              <ShoppingCart className="h-[18px] w-[18px]" />
              {cartCount > 0 && (
                <span
                  key={cartCount}
                  className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-white text-black text-[10px] font-semibold animate-badge-pop"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Panel desplegable a todo el ancho, del mismo negro que la barra */}
        <div
          className={cn(
            'absolute inset-x-0 top-full bg-black transition-[opacity,transform,visibility] duration-300 ease-apple',
            menu ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-3 pointer-events-none'
          )}
        >
          <div className="max-w-[1024px] mx-auto px-6 md:px-10 pt-10 pb-14">
            {menu === 'marcas' && (
              <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
                <div>
                  <p className="t-fine text-[#86868b] mb-4">Explorar marcas</p>
                  <ul className="grid grid-cols-2 gap-x-10 gap-y-2">
                    {brands.map((brand, i) => (
                      <li key={brand.id} className="hero-rise" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                        <Link
                          href={`/productos?brand=${brand.slug}`}
                          className="text-2xl font-semibold tracking-tight text-[#e8e8ed] hover:text-white transition-colors"
                        >
                          {brand.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="t-fine text-[#86868b] mb-4">Más</p>
                  <ul className="space-y-2.5 t-caption">
                    <li><Link href="/productos" className="text-[#e8e8ed] hover:text-white">Ver todo el catálogo</Link></li>
                    <li><Link href="/nuevos-ingresos" className="text-[#e8e8ed] hover:text-white">Nuevos ingresos</Link></li>
                    <li><Link href="/ofertas" className="text-[#e8e8ed] hover:text-white">Ofertas</Link></li>
                  </ul>
                </div>
              </div>
            )}

            {menu === 'streetwear' && (
              <div className="grid gap-10 md:grid-cols-[2fr_1fr]">
                <div>
                  <p className="t-fine text-[#86868b] mb-4">Explorar streetwear</p>
                  <ul className="space-y-2">
                    {STREETWEAR_SUBCATEGORIES.map((sub, i) => (
                      <li key={sub.value} className="hero-rise" style={{ animationDelay: `${i * 30}ms` }}>
                        <Link
                          href={`/productos?streetwear&sub=${sub.value}`}
                          className="text-2xl font-semibold tracking-tight text-[#e8e8ed] hover:text-white transition-colors"
                        >
                          {sub.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="t-fine text-[#86868b] mb-4">Más</p>
                  <ul className="space-y-2.5 t-caption">
                    <li><Link href="/productos?streetwear" className="text-[#e8e8ed] hover:text-white">Todo streetwear</Link></li>
                    <li><Link href="/encargos" className="text-[#e8e8ed] hover:text-white">Encargos personalizados</Link></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="lg:hidden px-4 pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fadeIn">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = search.trim();
                setShowSearch(false);
                if (!q) return router.push('/productos');
                router.push(`/productos?q=${encodeURIComponent(q)}`);
              }}
            >
              <div className="relative">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscá por nombre, marca o talle"
                  aria-label="Buscar productos"
                  className="w-full rounded-full bg-white/10 px-4 py-3 pl-10 text-[17px] text-white placeholder-white/50 focus:bg-white/15 focus:outline-none"
                  autoFocus
                />
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Mientras el panel está abierto, la página de fondo se desenfoca (como en apple.com) */}
      <div
        aria-hidden
        onMouseEnter={() => setMenu(null)}
        className={cn(
          'fixed inset-0 z-30 bg-black/10 backdrop-blur-md transition-opacity duration-300 ease-apple',
          menu ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      />

      <BannerTicker />
    </>
  );
}
