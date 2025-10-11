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
  Upload, 
  Users,
  Settings
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: BarChart3 },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ShoppingCart },
  { name: 'Productos', href: '/admin/productos', icon: Package },
  { name: 'Stock', href: '/admin/stock', icon: Warehouse },
  { name: 'Precios', href: '/admin/precios', icon: DollarSign },
  { name: 'Destacados', href: '/admin/destacados', icon: Star },
  { name: 'Imágenes', href: '/admin/uploads', icon: Upload },
  { name: 'Clientes', href: '/admin/clientes', icon: Users },
  { name: 'Ajustes', href: '/admin/ajustes', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white text-black border-r border-gray-200">
      <nav className="p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-black hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
