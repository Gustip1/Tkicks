"use client";
import Link from 'next/link';
import { useState } from 'react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import { X, ChevronRight, ChevronDown } from 'lucide-react';
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
          'fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-black border-r border-zinc-800 shadow-2xl transition-transform duration-300 ease-out md:hidden',
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
        <nav className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
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
          </div>
        </nav>
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800 bg-zinc-900">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-black border border-green-500/50">
              ✓ 100% Original
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black border border-blue-500/50">
              📦 Envío nacional
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
