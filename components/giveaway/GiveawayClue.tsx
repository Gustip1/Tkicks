"use client";
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const CLUE_MAP: Record<string, string> = {
  '/': '2',
  '/productos': '6',
  '/ofertas': '0',
  '/encargos': '7',
  '/nosotros': '0',
  '/nuevos-ingresos': '5',
};

const STORAGE_KEY = 'tkicks_giveaway_found_paths';

export type FoundClue = {
  path: string;
  digit: string;
  foundAt: string;
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

export function GiveawayClue() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

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
  const digit = useMemo(() => CLUE_MAP[pathname], [pathname]);
  const isReal = Boolean(CLUE_MAP[pathname]);

  useEffect(() => {
    if (!active || !isReal || isAdmin || !digit) return;
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
    } catch {}
  }, [active, isReal, isAdmin, pathname, digit]);

  if (!active || isAdmin || !isReal || !digit) return null;

  return (
    <div className="mt-4 flex justify-end">
      <div
        className="rounded-lg border border-red-500/60 bg-black/85 px-2 py-1 shadow-lg rotate-[-3deg] transition hover:rotate-0"
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Pista</p>
        <p className="text-lg font-black leading-none text-red-500">
          {digit}
        </p>
      </div>
    </div>
  );
}
