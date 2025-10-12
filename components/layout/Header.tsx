"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Menu, Search as SearchIcon, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useUIStore } from '@/store/ui';
import { BannerTicker } from './BannerTicker';

export function Header() {
	const toggleSidebar = useUIStore((s) => s.toggleSidebar);
	const openCart = useUIStore((s) => s.openCart);
	const [isAdmin, setIsAdmin] = useState(false);
	const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  const isInAdmin = pathname.startsWith('/admin');

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

	return (
		<header className="sticky top-0 z-40">
			<BannerTicker />
			<div className="grid h-16 grid-cols-3 items-center border-b border-neutral-800 bg-black px-4 md:px-6">
			<div className="flex items-center gap-2">
				{/* Botón hamburguesa en móvil */}
				<button
					onClick={toggleSidebar}
					className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-neutral-800 md:hidden"
					aria-label="Abrir menú"
				>
					<Menu className="h-5 w-5" />
				</button>
				{/* Enlaces en desktop */}
				<Link
					href="/productos?sneakers"
					className="hidden rounded-md px-3 py-2 text-sm text-white hover:bg-neutral-800 md:inline-block"
				>
					Sneakers
				</Link>
				<Link
					href="/productos?streetwear"
					className="hidden rounded-md px-3 py-2 text-sm text-white hover:bg-neutral-800 md:inline-block"
				>
					Streetwear
				</Link>
				<Link
					href="/encargos"
					className="hidden rounded-md px-3 py-2 text-sm text-white hover:bg-neutral-800 md:inline-block"
				>
					Encargos
				</Link>
			</div>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="flex items-center">
            <img src="/logo.jpg" alt="Tkicks" className="h-12 w-auto" />
          </Link>
          <form
            className="relative hidden md:block"
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
              placeholder="Buscar productos…"
              className="peer w-64 rounded border border-neutral-700 bg-neutral-900 px-9 py-2 text-sm text-white placeholder-neutral-400 transition-colors focus:border-neutral-500"
            />
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 transition-transform peer-focus:scale-110" />
          </form>
        </div>
			<nav className="ml-auto flex items-center justify-end gap-2">
				{isAdmin && (
					<Link
						href="/admin"
						className="rounded-md px-3 py-2 text-sm text-white hover:bg-neutral-800"
					>
						Admin
					</Link>
				)}
				{!isAdmin && !user && (
					<Link
						href="/login"
						className="rounded-md px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-800"
					>
						Admin
					</Link>
				)}
					<button
						className="inline-flex items-center justify-center rounded-md p-2 text-white hover:bg-neutral-800"
						aria-label="Abrir carrito"
						onClick={openCart}
					>
						<ShoppingCart className="h-5 w-5" />
					</button>
				</nav>
			</div>
		</header>
	);
}



