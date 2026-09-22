"use client";
import Link from 'next/link';
import Image from 'next/image';
import logo from '@/public/logo.jpg';
import { useEffect, useState } from 'react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import { X, ChevronDown } from 'lucide-react';
import { STREETWEAR_SUBCATEGORIES, Brand } from '@/types/db';
import { createBrowserClient } from '@/lib/supabase/client';

export function Sidebar() {
  const isOpen = useUIStore((s) => s.isSidebarOpen);
  const close = useUIStore((s) => s.closeSidebar);
  const [streetwearOpen, setStreetwearOpen] = useState(false);
  const [marcasOpen, setMarcasOpen] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasSession, setHasSession] = useState(false);

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

  // El link "Admin" del header desktop está oculto en mobile (hidden sm:flex);
  // este es el único acceso al panel de administración en la versión móvil.
  useEffect(() => {
    const supabase = createBrowserClient();
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setHasSession(false);
        return;
      }
      if (!cancelled) setHasSession(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!cancelled) setIsAdmin(profile?.role === 'admin');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ESC to close + lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, close]);

  // Cada ítem entra escalonado, como el menú móvil de apple.com
  const item = (i: number) => ({ style: { animationDelay: `${60 + i * 35}ms` } });
  const bigLink =
    'block py-1.5 text-[28px] leading-[1.14] font-semibold tracking-[-0.015em] text-[#e8e8ed] hover:text-white transition-colors';

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black text-white xl:hidden flex flex-col pt-[env(safe-area-inset-top)] transition-[opacity,visibility] duration-300 ease-apple',
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
      aria-hidden={!isOpen}
    >
      {/* Barra superior: misma altura que la nav, con el logo y la X */}
      <div className="h-12 shrink-0 flex items-center justify-between px-2">
        <Link href="/" onClick={close} className="px-2" aria-label="Inicio">
          <Image src={logo} alt="Tkicks" className="h-8 w-auto invert" />
        </Link>
        <button
          onClick={close}
          className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full text-white/80 hover:text-white transition-colors"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* key: al abrir se vuelve a montar la lista y la entrada escalonada se repite */}
      <nav key={isOpen ? 'abierto' : 'cerrado'} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-8 pt-4 pb-10">
        <ul>
          <li className="hero-rise" {...item(0)}>
            <Link href="/nuevos-ingresos" onClick={close} className={bigLink}>Nuevos ingresos</Link>
          </li>

          {brands.length > 0 && (
            <li className="hero-rise" {...item(1)}>
              <button
                type="button"
                onClick={() => setMarcasOpen((v) => !v)}
                aria-expanded={marcasOpen}
                className={cn(bigLink, 'w-full text-left flex items-center justify-between')}
              >
                Marcas
                <ChevronDown className={cn('w-5 h-5 text-white/50 transition-transform duration-300', marcasOpen && 'rotate-180')} />
              </button>
              {marcasOpen && (
                <ul className="pl-1 pb-3 grid grid-cols-2 gap-x-4">
                  {brands.map((brand) => (
                    <li key={brand.id}>
                      <Link
                        href={`/productos?brand=${brand.slug}`}
                        onClick={close}
                        className="block py-1.5 t-body text-[#86868b] hover:text-white"
                      >
                        {brand.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          <li className="hero-rise" {...item(2)}>
            <Link href="/productos?sneakers" onClick={close} className={bigLink}>Sneakers</Link>
          </li>

          <li className="hero-rise" {...item(3)}>
            <button
              type="button"
              onClick={() => setStreetwearOpen((v) => !v)}
              aria-expanded={streetwearOpen}
              className={cn(bigLink, 'w-full text-left flex items-center justify-between')}
            >
              Streetwear
              <ChevronDown className={cn('w-5 h-5 text-white/50 transition-transform duration-300', streetwearOpen && 'rotate-180')} />
            </button>
            {streetwearOpen && (
              <ul className="pl-1 pb-3">
                {STREETWEAR_SUBCATEGORIES.map((sub) => (
                  <li key={sub.value}>
                    <Link
                      href={`/productos?streetwear&sub=${sub.value}`}
                      onClick={close}
                      className="block py-1.5 t-body text-[#86868b] hover:text-white"
                    >
                      {sub.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/productos?streetwear" onClick={close} className="block py-1.5 t-body text-[#2997ff]">
                    Ver todo streetwear
                  </Link>
                </li>
              </ul>
            )}
          </li>

          <li className="hero-rise" {...item(4)}>
            <Link href="/ofertas" onClick={close} className={bigLink}>Ofertas</Link>
          </li>
          <li className="hero-rise" {...item(5)}>
            <Link href="/subastas" onClick={close} className={bigLink}>Subastas</Link>
          </li>
          <li className="hero-rise" {...item(6)}>
            <Link href="/encargos" onClick={close} className={bigLink}>Encargos</Link>
          </li>
          <li className="hero-rise" {...item(7)}>
            <Link href="/nosotros" onClick={close} className={bigLink}>Nosotros</Link>
          </li>
        </ul>

        {/* Links chicos al pie, como "Cuenta" / "Pedidos" en el menú de Apple */}
        <ul className="hero-rise mt-8 space-y-3 t-caption text-[#86868b]" {...item(9)}>
          {/* El link "Admin" del header está oculto en celular: éste es el único acceso al panel */}
          {isAdmin && (
            <li><Link href="/admin" onClick={close} className="hover:text-white">Panel de administración</Link></li>
          )}
          {!isAdmin && !hasSession && (
            <li><Link href="/login" onClick={close} className="hover:text-white">Ingresar</Link></li>
          )}
          <li><Link href="/track" onClick={close} className="hover:text-white">Seguí tu pedido</Link></li>
          <li>
            <a href="https://www.instagram.com/tkicks.sj" target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>
          </li>
          <li>
            <a href="https://www.tiktok.com/@tkicks.sj" target="_blank" rel="noreferrer" className="hover:text-white">TikTok</a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
