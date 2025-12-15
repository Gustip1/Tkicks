"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Warehouse, 
  DollarSign, 
  Star, 
  Flame,
  Upload, 
  Users,
  Settings,
  ChevronRight,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart, color: 'text-green-600', bg: 'bg-green-50' },
  { name: 'Productos', href: '/admin/productos', icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Stock', href: '/admin/stock', icon: Warehouse, color: 'text-amber-600', bg: 'bg-amber-50' },
  { name: 'Precios', href: '/admin/precios', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Destacados', href: '/admin/destacados', icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { name: 'Ofertas', href: '/admin/ofertas', icon: Flame, color: 'text-red-600', bg: 'bg-red-50' },
  { name: 'Imágenes', href: '/admin/uploads', icon: Upload, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { name: 'Clientes', href: '/admin/clientes', icon: Users, color: 'text-pink-600', bg: 'bg-pink-50' },
  { name: 'Ajustes', href: '/admin/ajustes', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar - completamente oculto en móvil */}
      <aside className="hidden md:flex md:flex-col w-64 bg-white border-r border-gray-200">
        {/* Logo area */}
        <div className="p-4 border-b border-gray-200">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">Tkicks</h1>
              <p className="text-xs text-gray-500">Panel de admin</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gray-900 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                  isActive ? "bg-white/20" : item.bg
                )}>
                  <Icon className={cn("h-4 w-4", isActive ? "text-white" : item.color)} />
                </div>
                <span className="flex-1">{item.name}</span>
                {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <Home className="h-4 w-4 text-gray-500" />
            </div>
            <span>Ir a la tienda</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
