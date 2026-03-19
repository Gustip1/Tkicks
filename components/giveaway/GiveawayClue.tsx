"use client";
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const CLUE_MAP: Record<string, string> = {
  '/': '2',
  '/productos': '6',
  '/ofertas': '0',
  '/encargos': '7',
  '/nosotros': '0',
  '/sorteo': '5',
};

const STORAGE_KEY = 'tkicks_giveaway_found_paths';

function getDecoy(pathname: string) {
  const seed = pathname
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return String((seed % 9) + 1);
}

export function GiveawayClue() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [foundCount, setFoundCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/sorteo/state', { cache: 'no-store' });
        const data = await res.json();
        if (mounted) setActive(Boolean(data?.active));
      } catch {
        if (mounted) setActive(false);
      }
    };

    void fetchState();
    const timer = setInterval(fetchState, 30000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const isAdmin = pathname.startsWith('/admin');
  const digit = useMemo(() => CLUE_MAP[pathname] || getDecoy(pathname), [pathname]);
  const isReal = Boolean(CLUE_MAP[pathname]);

  useEffect(() => {
    if (!active || !isReal || isAdmin) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const found = Array.isArray(parsed) ? (parsed as string[]) : [];
      const unique = new Set(found);
      unique.add(pathname);
      const next = Array.from(unique);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setFoundCount(next.length);
    } catch {
      setFoundCount(0);
    }
  }, [active, isReal, isAdmin, pathname]);

  useEffect(() => {
    if (!active || isAdmin) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const found = Array.isArray(parsed) ? (parsed as string[]) : [];
      setFoundCount(found.length);
    } catch {
      setFoundCount(0);
    }
  }, [active, isAdmin, pathname]);

  if (!active || isAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none space-y-2">
      <div className="rounded-xl border border-zinc-700 bg-black/95 px-2.5 py-1.5 shadow-lg">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Pistas encontradas</p>
        <p className="text-sm font-black text-white">{foundCount}/{Object.keys(CLUE_MAP).length}</p>
      </div>
      <div
        className={`rounded-xl border px-2.5 py-1.5 shadow-lg ${
          isReal ? 'border-red-500/70 bg-black' : 'border-zinc-600 bg-zinc-950'
        }`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Pista</p>
        <p className={`text-xl font-black leading-none ${isReal ? 'text-red-500' : 'text-zinc-500'}`}>
          {digit}
        </p>
      </div>
      <div className="max-w-[170px] rounded-xl border border-zinc-700 bg-zinc-950/95 px-2.5 py-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Pista general</p>
        <p className="text-[10px] font-bold text-zinc-300">Las pistas están en toda la web.</p>
      </div>
    </div>
  );
}
