"use client";
import Link from 'next/link';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import { X, ChevronRight } from 'lucide-react';

const links = [
  { href: '/productos?sneakers', label: 'Sneakers', icon: '👟', desc: 'Calzado premium' },
  { href: '/productos?streetwear', label: 'Streetwear', icon: '👕', desc: 'Ropa urbana' },
  { href: '/ofertas', label: 'Ofertas', icon: '🔥', special: true, desc: 'Precios especiales' },
  { href: '/encargos', label: 'Encargos', icon: '📦', desc: 'Pedidos especiales' }
];

export function Sidebar() {
  const isOpen = useUIStore((s) => s.isSidebarOpen);
  const close = useUIStore((s) => s.closeSidebar);

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
        <nav className="p-4">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3 px-2">
            Categorías
          </p>
          <div className="space-y-1">
            {links.map((l) => {
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 transition-all font-black',
                    l.special 
                      ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md hover:shadow-lg hover:scale-[1.02]' 
                      : 'hover:bg-zinc-800 text-white'
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-2xl",
                    l.special ? "bg-white/20" : "bg-zinc-800"
                  )}>
                    {l.icon}
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-black uppercase tracking-tight", l.special ? "text-white" : "text-white")}>
                      {l.label}
                    </p>
                    <p className={cn("text-xs font-bold", l.special ? "text-white/80" : "text-gray-400")}>
                      {l.desc}
                    </p>
                  </div>
                  <ChevronRight className={cn(
                    "w-5 h-5",
                    l.special ? "text-white/60" : "text-gray-400"
                  )} />
                </Link>
              );
            })}
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
