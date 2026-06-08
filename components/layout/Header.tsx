"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Menu, Search as SearchIcon, X, ChevronDown } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useUIStore } from '@/store/ui';
import { useCartStore } from '@/store/cart';
import { BannerTicker } from './BannerTicker';
import { STREETWEAR_SUBCATEGORIES } from '@/types/db';

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const openCart = useUIStore((s) => s.openCart);
  const cartItems = useCartStore((s) => s.items);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
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

  if (isInAdmin) return null;

  return (
    <header className="sticky top-0 z-40 bg-white/98 backdrop-blur-md border-b border-gray-200 shadow-sm pt-[env(safe-area-inset-top)]">
      <BannerTicker />
      <div className="h-14 md:h-16 px-2 md:px-8 flex items-center justify-between gap-2 md:gap-4 max-w-[1600px] mx-auto">
        {/* Left - Menu & Nav */}
        <div className="flex items-center gap-1 md:gap-4">
          <button
            onClick={toggleSidebar}
            className="inline-flex items-center justify-center rounded-xl p-3 min-h-[44px] min-w-[44px] text-gray-900 hover:bg-gray-100 active:bg-gray-200 md:hidden transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/productos?sneakers"
              className="rounded-xl px-4 py-2 text-sm font-black text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 uppercase tracking-tight"
            >
              <span className="text-base">👟</span>
              Sneakers
            </Link>

            <div className="relative group">
              <Link
                href="/productos?streetwear"
                className="rounded-xl px-4 py-2 text-sm font-black text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-2 uppercase tracking-tight"
              >
                <span className="text-base">👕</span>
                Streetwear
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900 transition-colors" />
              </Link>

              <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 space-y-0.5">
                    {STREETWEAR_SUBCATEGORIES.map((sub) => (
                      <Link
                        key={sub.value}
                        href={`/productos?streetwear&sub=${sub.value}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                      >
                        <span className="text-lg">{sub.icon}</span>
                        <span>{sub.label}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-gray-200">
                    <Link
                      href="/productos?streetwear"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-black text-gray-900 hover:bg-gray-50 transition-all uppercase tracking-tight"
                    >
                      Ver todo en Streetwear
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/ofertas"
              className="rounded-xl px-4 py-2 text-sm font-black text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2 uppercase tracking-tight"
            >
              🔥 Ofertas
            </Link>
            <Link
              href="/subastas"
              className="rounded-xl px-4 py-2 text-sm font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
            >
              Subastas
            </Link>
            <Link
              href="/encargos"
              className="rounded-xl px-4 py-2 text-sm font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
            >
              Encargos
            </Link>
            <Link
              href="/nosotros"
              className="rounded-xl px-4 py-2 text-sm font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
            >
              Nosotros
            </Link>
          </nav>
        </div>

        {/* Center - Logo */}
        <Link href="/" className="flex items-center">
          <img src="/logo.jpg" alt="Tkicks" className="h-8 md:h-12 w-auto" />
        </Link>

        {/* Right - Search & Actions */}
        <div className="flex items-center gap-2">
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
              placeholder="Buscar..."
              className="w-48 xl:w-64 rounded-xl border border-gray-300 bg-gray-50 px-4 py-2 pl-10 text-sm text-gray-900 placeholder-gray-400 font-bold transition-all focus:w-72 focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            />
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </form>

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="lg:hidden inline-flex items-center justify-center rounded-xl p-3 min-h-[44px] min-w-[44px] text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Buscar"
          >
            {showSearch ? <X className="h-5 w-5" /> : <SearchIcon className="h-5 w-5" />}
          </button>

          {isAdmin && (
            <>
              <Link
                href="/admin"
                className="hidden sm:flex rounded-xl px-4 py-2 text-sm font-black text-gray-900 hover:bg-gray-100 transition-colors uppercase tracking-tight"
              >
                Admin
              </Link>
              <Link
                href="/admin"
                className="sm:hidden inline-flex rounded-xl px-2.5 py-1.5 text-[11px] font-black text-gray-900 border border-gray-300 hover:bg-gray-100 transition-colors uppercase tracking-tight"
              >
                Admin
              </Link>
            </>
          )}

          {!isAdmin && !user && (
            <>
              <Link
                href="/login"
                className="hidden sm:flex rounded-xl px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 transition-colors font-bold"
              >
                Admin
              </Link>
              <Link
                href="/login"
                className="sm:hidden inline-flex rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Admin
              </Link>
            </>
          )}

          <button
            className="relative inline-flex items-center justify-center rounded-xl p-3 min-h-[44px] min-w-[44px] text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Abrir carrito"
            onClick={openCart}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-black text-white text-[10px] font-black border-2 border-white">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="lg:hidden px-4 pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fadeIn bg-white border-t border-gray-100">
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
                placeholder="¿Qué estás buscando?"
                className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 pl-10 text-sm text-gray-900 placeholder-gray-400 font-bold focus:border-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                autoFocus
              />
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
          </form>
        </div>
      )}
    </header>
  );
}
