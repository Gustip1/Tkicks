"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const TOTAL_CLUES = 6;
const CLUE_SEQUENCE = ['2', '6', '0', '7', '0', '5'];
const STORAGE_KEY = 'tkicks_giveaway_found_paths';

export type FoundClue = {
  id: string;
  label: string;
  path?: string;
  digit: string;
  foundAt: string;
};

export function getProductClueForSlug(slug: string): string | null {
  const hash = slug.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const selected = hash % 3 === 0;
  if (!selected) return null;
  return CLUE_SEQUENCE[hash % CLUE_SEQUENCE.length];
}

function normalizeClues(raw: string | null): FoundClue[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.every((item) => typeof item === 'string')) {
      return (parsed as string[]).map((path) => ({
        id: path,
        label: path,
        path,
        digit: '?',
        foundAt: new Date().toISOString(),
      }));
    }
    return (parsed as FoundClue[]).filter((item) => Boolean(item?.id) && Boolean(item?.digit));
  } catch {
    return [];
  }
}

function saveClue(clueId: string, label: string, digit: string, path: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const found = normalizeClues(raw);
    const map = new Map(found.map((c) => [c.id, c]));
    if (!map.has(clueId)) {
      map.set(clueId, { id: clueId, label, path, digit, foundAt: new Date().toISOString() });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.values())));
    }
  } catch {}
}

// ─── Widget flotante bottom-right ───────────────────────────────────────────

export function GiveawayClue() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [foundClues, setFoundClues] = useState<FoundClue[]>([]);

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
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          setFoundClues([]);
          return;
        }

        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (mounted) setFoundClues(normalizeClues(raw));
        } catch {
          if (mounted) setFoundClues([]);
        }
      } catch {
        if (mounted) setActive(false);
      }
    };

    void fetchState();
    const timer = setInterval(fetchState, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  if (!active || pathname.startsWith('/admin')) return null;

  const foundCount = foundClues.length;

  return (
    <Link href="/sorteo" aria-label="Ver progreso del sorteo">
      <div className="fixed bottom-4 right-4 z-50 cursor-pointer rounded-2xl border border-zinc-800 bg-black/95 px-3.5 py-3 shadow-2xl shadow-black/50 backdrop-blur-md transition-all duration-200 hover:border-red-500/40 hover:shadow-red-950/30">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">Sorteo · Pistas</p>
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
            const clue = foundClues[i];
            return (
              <div
                key={i}
                title={clue ? `Pista ${i + 1}: ${clue.digit}` : `Pista ${i + 1}: no encontrada`}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-black transition-all duration-300 ${
                  clue
                    ? 'bg-red-500 text-white shadow-md shadow-red-900/50'
                    : 'border border-zinc-800 bg-zinc-950 text-zinc-700'
                }`}
              >
                {clue ? clue.digit : '·'}
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-[9px] font-bold text-zinc-600">
          <span className={foundCount > 0 ? 'text-red-500' : ''}>{foundCount}</span>/{TOTAL_CLUES} encontradas
        </p>
      </div>
    </Link>
  );
}

// ─── Badge inline junto al precio ───────────────────────────────────────────

type InlinePriceClueProps = {
  clueId: string;
  label: string;
  digit: string;
};

export function GiveawayInlinePriceClue({ clueId, label, digit }: InlinePriceClueProps) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/sorteo/state', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const isActive = Boolean(data?.active);
        setActive(isActive);
        if (!isActive) {
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          return;
        }
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (normalizeClues(raw).some((c) => c.id === clueId)) setSaved(true);
        } catch {}
      })
      .catch(() => { if (mounted) setActive(false); });
    return () => { mounted = false; };
  }, [clueId]);

  const handleHover = () => {
    if (!active || saved || pathname.startsWith('/admin')) return;
    saveClue(clueId, label, digit, pathname);
    setSaved(true);
  };

  if (!active || pathname.startsWith('/admin')) return null;

  return (
    <span
      onMouseEnter={handleHover}
      className={`inline-flex cursor-default select-none items-center rounded-md border px-2 py-0.5 text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
        saved
          ? 'border-red-500/70 bg-red-500/10 text-red-400'
          : 'border-red-500/30 bg-black/40 text-red-500/60 hover:border-red-500/70 hover:bg-red-500/10 hover:text-red-400'
      }`}
    >
      {saved ? `✓ ${digit}` : 'fecha'}
    </span>
  );
}
