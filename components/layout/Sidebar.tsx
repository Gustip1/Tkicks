"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';

const links = [
  { href: '/productos?sneakers', label: 'Sneakers' },
  { href: '/productos?streetwear', label: 'Streetwear' },
  { href: '/encargos', label: 'Encargos' }
];

export function Sidebar() {
  const pathname = usePathname();
  const isOpen = useUIStore((s) => s.isSidebarOpen);
  const close = useUIStore((s) => s.closeSidebar);

  return (
    <aside className="relative">
      {/* Desktop */}
      <div className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 border-r border-neutral-800 bg-black p-4 md:block">
        <nav className="flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm text-white hover:bg-neutral-800',
                pathname.startsWith(l.href.split('?')[0]) && 'bg-neutral-800 font-medium'
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 translate-x-[-100%] border-r border-neutral-800 bg-black p-4 transition-transform md:hidden',
          isOpen && 'translate-x-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
      >
        <nav className="mt-8 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={close}
              className={cn('rounded-md px-3 py-2 text-base text-white hover:bg-neutral-800')}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      {isOpen && (
        <button
          aria-label="Cerrar menú"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
        />
      )}
    </aside>
  );
}



