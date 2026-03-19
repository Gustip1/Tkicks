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

type FoundClue = {
  path: string;
  digit: string;
  foundAt: string;
};

const CLUE_POSITION_MAP: Record<string, string> = {
  '/': 'top-[22%] right-3',
  '/productos': 'top-[36%] left-3',
  '/ofertas': 'bottom-20 right-3',
  '/encargos': 'top-[46%] right-4',
  '/nosotros': 'bottom-24 left-3',
  '/sorteo': 'top-[28%] right-3',
};

function normalizeClues(raw: string | null): FoundClue[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Backward compatibility: older format was string[] paths
    if (parsed.every((item) => typeof item === 'string')) {
      return (parsed as string[])
        .filter((path) => Boolean(CLUE_MAP[path]))
        .map((path) => ({
          path,
          digit: CLUE_MAP[path],
          foundAt: new Date().toISOString(),
        }));
    }

    return (parsed as FoundClue[]).filter(
      (item) => Boolean(item?.path) && Boolean(item?.digit)
    );
  } catch {
    return [];
  }
}

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
        const isActive = Boolean(data?.active);
        if (mounted) setActive(isActive);

        if (!isActive) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
          if (mounted) setFoundCount(0);
        }
      } catch {
        if (mounted) setActive(false);
      }
    };

    void fetchState();
    const timer = setInterval(fetchState, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const isAdmin = pathname.startsWith('/admin');
  const digit = useMemo(() => CLUE_MAP[pathname] || getDecoy(pathname), [pathname]);
  const isReal = Boolean(CLUE_MAP[pathname]);
  const cluePosition = CLUE_POSITION_MAP[pathname] || 'bottom-24 right-3';

  useEffect(() => {
    if (!active || !isReal || isAdmin) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const found = normalizeClues(raw);
      const map = new Map(found.map((clue) => [clue.path, clue]));
      map.set(pathname, {
        path: pathname,
        digit,
        foundAt: new Date().toISOString(),
      });
      const next = Array.from(map.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setFoundCount(next.length);
    } catch {
      setFoundCount(0);
    }
  }, [active, isReal, isAdmin, pathname, digit]);

  useEffect(() => {
    if (!active || isAdmin) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const found = normalizeClues(raw);
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
      <div className={`fixed ${cluePosition}`}>
        <div
          className={`rounded-lg border px-2 py-1 shadow-lg rotate-[-3deg] transition hover:rotate-0 ${
            isReal
              ? 'border-red-500/60 bg-black/85'
              : 'border-zinc-700/80 bg-zinc-950/80'
          }`}
        >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Pista</p>
          <p className={`text-lg font-black leading-none ${isReal ? 'text-red-500' : 'text-zinc-500'}`}>
          {digit}
        </p>
        </div>
      </div>
      <div className="max-w-[170px] rounded-xl border border-zinc-700 bg-zinc-950/95 px-2.5 py-1.5">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">Pista general</p>
        <p className="text-[10px] font-bold text-zinc-300">Las pistas están en toda la web.</p>
      </div>
    </div>
  );
}
