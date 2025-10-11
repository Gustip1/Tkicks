"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Settings, User, LogOut } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase/client';

export function AdminHeader() {
  const pathname = usePathname();
  const supabase = createBrowserClient();
  
  const getPageTitle = () => {
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/productos')) return 'Productos';
    if (pathname.startsWith('/admin/pedidos')) return 'Pedidos';
    if (pathname.startsWith('/admin/stock')) return 'Stock';
    if (pathname.startsWith('/admin/precios')) return 'Precios';
    if (pathname.startsWith('/admin/destacados')) return 'Destacados';
    if (pathname.startsWith('/admin/uploads')) return 'Imágenes';
    if (pathname.startsWith('/admin/clientes')) return 'Clientes';
    return 'Admin';
  };

  return (
    <header className="border-b border-gray-200 bg-white text-black px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="flex items-center">
            <img src="/logo.jpg" alt="Tkicks" className="h-8 w-auto" />
          </Link>
          <span className="text-gray-400">•</span>
          <h1 className="text-xl font-semibold text-black">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="rounded-md p-2 text-gray-700 hover:bg-gray-100">
            <Bell className="h-5 w-5" />
          </button>
          <button className="rounded-md p-2 text-gray-700 hover:bg-gray-100">
            <Settings className="h-5 w-5" />
          </button>
          <button className="rounded-md p-2 text-gray-700 hover:bg-gray-100">
            <User className="h-5 w-5" />
          </button>
          <button
            className="rounded-md p-2 text-gray-700 hover:bg-gray-100"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
            title="Salir"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
