"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const TOTAL_CLUES = 6;

const STORAGE_KEY = 'tkicks_giveaway_found_paths';

export type FoundClue = {
  id: string;
  label: string;
  path?: string;
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
        .map((path) => ({
          id: path,
          label: path,
          path,
          digit: '?',
          foundAt: new Date().toISOString(),
        }));
    }

    return (parsed as FoundClue[]).filter(
      (item) => Boolean(item?.id) && Boolean(item?.digit)
    );
  } catch {
    return [];
  }
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
          return;
        }

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const found = normalizeClues(raw);
          if (mounted) setFoundCount(found.length);
        } catch {
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
  if (!active || isAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-zinc-700 bg-black/90 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Pistas encontradas</p>
      <p className="text-sm font-black text-white">{foundCount}/{TOTAL_CLUES}</p>
      <p className="text-[10px] font-bold text-zinc-400">Detalle completo en /sorteo</p>
    </div>
  );
}

type InlinePriceClueProps = {
  clueId: string;
  label: string;
  digit: string;
};

export function GiveawayInlinePriceClue({ clueId, label, digit }: InlinePriceClueProps) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/sorteo/state', { cache: 'no-store' });
        const data = await res.json();
        const isActive = Boolean(data?.active);
        if (!mounted) return;
        setActive(isActive);
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
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!active || pathname.startsWith('/admin')) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const found = normalizeClues(raw);
      const map = new Map(found.map((clue) => [clue.id, clue]));
      map.set(clueId, {
        id: clueId,
        label,
        path: pathname,
        digit,
        foundAt: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.values())));
    } catch {}
  }, [active, clueId, label, digit, pathname]);

  if (!active || pathname.startsWith('/admin')) return null;

  return (
    <span className="inline-flex items-center rounded-md border border-red-500/60 bg-black/70 px-2 py-0.5 text-xs font-black text-red-500">
      PISTA {digit}
    </span>
  );
}
