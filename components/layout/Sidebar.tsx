"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import { X, ChevronRight, ChevronDown, Instagram } from 'lucide-react';
import { STREETWEAR_SUBCATEGORIES } from '@/types/db';

export function Sidebar() {
  const isOpen = useUIStore((s) => s.isSidebarOpen);
  const close = useUIStore((s) => s.closeSidebar);
  const [streetwearOpen, setStreetwearOpen] = useState(false);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
      />
      
      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-black border-r border-zinc-800 shadow-2xl transition-transform duration-300 ease-out md:hidden pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <Link href="/" onClick={close} className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Tkicks" className="h-10 w-auto" />
            <div>
              <p className="font-black text-white uppercase tracking-tight">Tkicks</p>
              <p className="text-xs text-gray-400 font-bold">Sneakers & Streetwear</p>
            </div>
          </Link>
          <button
            onClick={close}
            className="p-2 rounded-xl hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav
          className="p-4 overflow-y-auto"
          style={{ maxHeight: 'calc(100svh - 140px - env(safe-area-inset-top) - env(safe-area-inset-bottom))' }}
        >
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 px-2">
            Categorías
          </p>
          <div className="space-y-1">
            {/* Sneakers */}
            <Link
              href="/productos?sneakers"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-zinc-800 text-white"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-zinc-800">
                👟
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-white">Sneakers</p>
                <p className="text-xs font-bold text-gray-400">Calzado premium</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            {/* Streetwear con subcategorías */}
            <div>
              <button
                onClick={() => setStreetwearOpen(!streetwearOpen)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-zinc-800 text-white"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-zinc-800">
                  👕
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black uppercase tracking-tight text-white">Streetwear</p>
                  <p className="text-xs font-bold text-gray-400">Ropa urbana</p>
                </div>
                <ChevronDown className={cn(
                  "w-5 h-5 text-gray-400 transition-transform duration-200",
                  streetwearOpen && "rotate-180"
                )} />
              </button>

              {/* Subcategorías */}
              <div className={cn(
                "overflow-hidden transition-all duration-200 ease-out",
                streetwearOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className="ml-6 pl-4 border-l border-zinc-700 space-y-0.5 py-1">
                  {STREETWEAR_SUBCATEGORIES.map((sub) => (
                    <Link
                      key={sub.value}
                      href={`/productos?streetwear&sub=${sub.value}`}
                      onClick={close}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-300 hover:text-white hover:bg-zinc-800 transition-all"
                    >
                      <span className="text-lg">{sub.icon}</span>
                      <span>{sub.label}</span>
                    </Link>
                  ))}
                  {/* Ver todo en Streetwear */}
                  <Link
                    href="/productos?streetwear"
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all mt-1 border-t border-zinc-700/50 pt-2.5"
                  >
                    <span className="text-lg">🔥</span>
                    <span>Ver todo en Streetwear</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Ofertas */}
            <Link
              href="/ofertas"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02]"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-white/20">
                🔥
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-white">Ofertas</p>
                <p className="text-xs font-bold text-white/80">Precios especiales</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </Link>

            {/* Encargos */}
            <Link
              href="/encargos"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-zinc-800 text-white"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-zinc-800">
                📦
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-white">Encargos</p>
                <p className="text-xs font-bold text-gray-400">Pedidos especiales</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

            <Link
              href="/nosotros"
              onClick={close}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black hover:bg-zinc-800 text-white"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-zinc-800">
                ✨
              </div>
              <div className="flex-1">
                <p className="font-black uppercase tracking-tight text-white">Nosotros</p>
                <p className="text-xs font-bold text-gray-400">Quiénes somos + redes</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>

          </div>
        </nav>
        
        {/* Footer: Social connect */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-zinc-800 bg-gradient-to-b from-zinc-900 to-black space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-1">Seguinos</p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.instagram.com/tkicks.sj"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-xl p-2.5 bg-gradient-to-br from-[#833ab4]/40 via-[#fd1d1d]/30 to-[#fcb045]/30 border border-white/10 hover:border-white/25 active:scale-[0.98] transition-all"
              aria-label="Instagram @tkicks.sj"
            >
              <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/70 leading-none">IG</p>
                <p className="text-xs font-black text-white truncate leading-tight mt-0.5">@tkicks.sj</p>
              </div>
            </a>
            <a
              href="https://www.tiktok.com/@tkicks.sj"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 rounded-xl p-2.5 bg-gradient-to-br from-black via-zinc-900 to-black border border-white/10 hover:border-white/25 active:scale-[0.98] transition-all"
              aria-label="TikTok @tkicks.sj"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white" aria-hidden="true">
                  <path d="M19.321 6.5a6.67 6.67 0 0 1-3.892-1.246A6.67 6.67 0 0 1 13.07 1.5h-3.24v13.09a3.15 3.15 0 1 1-2.26-3.02V8.32a6.38 6.38 0 1 0 5.5 6.32V8.83a9.8 9.8 0 0 0 6.25 2.12V7.72a6.5 6.5 0 0 1-.001-.004z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/70 leading-none">TikTok</p>
                <p className="text-xs font-black text-white truncate leading-tight mt-0.5">@tkicks.sj</p>
              </div>
            </a>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
              ✓ Originales
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-black border border-blue-500/30">
              📦 Envío nacional
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
