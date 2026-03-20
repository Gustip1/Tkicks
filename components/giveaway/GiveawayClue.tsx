"use client";
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export const TOTAL_CLUES = 6;
export const CLUE_SEQUENCE = ['2', '6', '0', '7', '0', '5'] as const;
const STORAGE_KEY = 'tkicks_giveaway_found_paths';
const CLUE_EVENT = 'tkicks-clue-found';

// Cuántas veces aparece cada dígito en el código 260705
// 2→1, 6→1, 0→2, 7→1, 5→1
const DIGIT_MAX: Record<string, number> = {};
CLUE_SEQUENCE.forEach((d) => { DIGIT_MAX[d] = (DIGIT_MAX[d] ?? 0) + 1; });

export type FoundClue = {
  id: string;
  label: string;
  path?: string;
  position: number;
  digit: string;
  foundAt: string;
};

// Productos por categoría:
//   sneakers   → posiciones {0, 5} = dígitos {2, 5}  ← sin 0 para no saturar
//   streetwear → posiciones {1, 3} = dígitos {6, 7}  ← sin 0 para no saturar
// El 0 solo aparece en páginas (/ofertas y /nosotros), garantizando sus 2 instancias.
const SNEAKERS_POS   = [0, 5] as const; // 2, 5
const STREETWEAR_POS = [1, 3] as const; // 6, 7

export function getProductClueInfo(slug: string, category?: string): { digit: string; position: number } | null {
  // DJB2 hash
  let h = 5381;
  for (const c of slug) h = ((h << 5) + h + c.charCodeAt(0)) & 0x7fffffff;

  // ~33 % de los productos muestran pista
  if (h % 3 !== 0) return null;

  const positions = category === 'sneakers'    ? SNEAKERS_POS
                  : category === 'streetwear'  ? STREETWEAR_POS
                  : null;

  const position = positions
    ? positions[(h >> 4) % positions.length]
    : (h >> 4) % 6;

  return { position, digit: CLUE_SEQUENCE[position] };
}

export function getProductClueForSlug(slug: string): string | null {
  return getProductClueInfo(slug)?.digit ?? null;
}

function normalizeClues(raw: string | null): FoundClue[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as FoundClue[]).filter((item) => Boolean(item?.id) && Boolean(item?.digit));
  } catch { return []; }
}

function readClues(): FoundClue[] {
  try { return normalizeClues(localStorage.getItem(STORAGE_KEY)); } catch { return []; }
}

function saveClue(clue: Omit<FoundClue, 'foundAt'>) {
  try {
    const found = readClues();

    // No guardar el mismo badge dos veces
    if (found.some((c) => c.id === clue.id)) return;

    // Respetar cuántas veces puede aparecer este dígito en el código
    // El 0 puede aparecer 2 veces, los demás solo 1 vez
    const max = DIGIT_MAX[clue.digit] ?? 1;
    const current = found.filter((c) => c.digit === clue.digit).length;
    if (current >= max) return;

    const next: FoundClue = { ...clue, foundAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...found, next]));
    window.dispatchEvent(new CustomEvent(CLUE_EVENT));
  } catch {}
}

// ─── Widget flotante bottom-right ────────────────────────────────────────────

export function GiveawayClue() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [foundClues, setFoundClues] = useState<FoundClue[]>([]);
  const [newIdx, setNewIdx] = useState<number | null>(null);

  const refresh = () => {
    try {
      const clues = readClues().sort(
        (a, b) => new Date(a.foundAt).getTime() - new Date(b.foundAt).getTime()
      );
      setFoundClues((prev) => {
        // Animar el slot nuevo
        if (clues.length > prev.length) {
          setNewIdx(clues.length - 1);
          setTimeout(() => setNewIdx(null), 900);
        }
        return clues;
      });
    } catch {}
  };

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
        refresh();
      } catch {
        if (mounted) setActive(false);
      }
    };

    void fetchState();
    const timer = setInterval(fetchState, 8000);
    const handler = () => refresh();
    window.addEventListener(CLUE_EVENT, handler);
    return () => { mounted = false; clearInterval(timer); window.removeEventListener(CLUE_EVENT, handler); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!active || pathname.startsWith('/admin')) return null;

  const foundCount = foundClues.length;

  return (
    <Link href="/sorteo" aria-label="Ver progreso del sorteo">
      <div className="fixed bottom-4 right-4 z-50 cursor-pointer select-none rounded-2xl border border-zinc-800 bg-black/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-md transition-all duration-200 hover:border-zinc-700">
        <p className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
          Pistas · <span className={foundCount > 0 ? 'text-red-500' : 'text-zinc-600'}>{foundCount}</span>/{TOTAL_CLUES}
        </p>
        {/* Slots en orden de descubrimiento */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
            const clue = foundClues[i];
            const isNew = newIdx === i;
            return (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black transition-all duration-300 ${
                  clue
                    ? isNew
                      ? 'scale-110 bg-red-400 text-white shadow-lg shadow-red-800/60'
                      : 'bg-red-500 text-white shadow-md shadow-red-900/40'
                    : 'border border-zinc-800 bg-zinc-950 text-zinc-700'
                }`}
              >
                {clue ? clue.digit : <span className="text-[10px]">?</span>}
              </div>
            );
          })}
        </div>
        <p className="mt-1.5 text-center text-[9px] font-bold text-zinc-700">ver en /sorteo →</p>
      </div>
    </Link>
  );
}

// ─── Badge inline junto al precio ────────────────────────────────────────────

type InlinePriceClueProps = {
  clueId: string;
  label: string;
  position: number;
  digit: string;
};

export function GiveawayInlinePriceClue({ clueId, label, position, digit }: InlinePriceClueProps) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch('/api/sorteo/state', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const isActive = Boolean(data?.active);
        setActive(isActive);
        if (!isActive) { try { localStorage.removeItem(STORAGE_KEY); } catch {} return; }
        if (readClues().some((c) => c.id === clueId)) setSaved(true);
      })
      .catch(() => { if (mounted) setActive(false); });
    return () => { mounted = false; };
  }, [clueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleHover = () => {
    setHovered(true);
    if (saved || !active || pathname.startsWith('/admin')) return;
    saveClue({ id: clueId, label, path: pathname, position, digit });
    setSaved(true);
  };

  if (!active || pathname.startsWith('/admin')) return null;

  return (
    <span
      onMouseEnter={handleHover}
      onMouseLeave={() => setHovered(false)}
      title={saved ? `Pista encontrada · ${digit}` : 'Pasá el mouse para revelar la pista'}
      className={`inline-flex cursor-default select-none items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
        saved
          ? 'border-red-500/60 bg-red-500/10 text-red-400'
          : hovered
          ? 'border-red-500/50 bg-red-500/10 text-red-400 scale-105'
          : 'border-zinc-700/60 bg-zinc-900/60 text-zinc-500 hover:border-zinc-600'
      }`}
    >
      {saved ? (
        <><span className="text-red-500">✦</span><span>{digit}</span></>
      ) : (
        <><span className="text-zinc-600">◈</span><span>pista</span></>
      )}
    </span>
  );
}
