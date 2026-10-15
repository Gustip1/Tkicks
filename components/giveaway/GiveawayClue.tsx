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

  // ~50 % de los productos muestran pista (la mitad son reales, el resto despistan)
  if ((h & 1) !== 0) return null;

  const positions = category === 'sneakers'    ? SNEAKERS_POS
                  : category === 'streetwear'  ? STREETWEAR_POS
                  : null;

  const position = positions
    ? positions[(h >> 1) % positions.length]
    : (h >> 1) % 6;

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

function saveClue(clue: Omit<FoundClue, 'foundAt'>): boolean {
  try {
    const found = readClues();

    // No guardar el mismo badge dos veces
    if (found.some((c) => c.id === clue.id)) return true; // ya guardado = real

    // Respetar cuántas veces puede aparecer este dígito en el código
    // El 0 puede aparecer 2 veces, los demás solo 1 vez
    const max = DIGIT_MAX[clue.digit] ?? 1;
    const current = found.filter((c) => c.digit === clue.digit).length;
    if (current >= max) return false; // cupo lleno = pista de despiste

    const next: FoundClue = { ...clue, foundAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...found, next]));
    window.dispatchEvent(new CustomEvent(CLUE_EVENT));
    return true;
  } catch { return false; }
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
        const isVisible = data?.visible === undefined ? true : Boolean(data.visible);
        const isActive = Boolean(data?.active);
        if (!mounted) return;
        setActive(isActive && isVisible);
        if (!isActive || !isVisible) {
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
      {/* Mismo material que los demás avisos: vidrio claro, esquinas de 18px */}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 cursor-pointer select-none rounded-[18px] bg-white/95 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.06] backdrop-blur-xl backdrop-saturate-150 transition-transform duration-150 active:scale-[0.97]">
        <p className="mb-2 text-[11px] font-semibold text-gray-500">
          Pistas del sorteo · <span className={foundCount > 0 ? 'text-red-600' : ''}>{foundCount}</span>/{TOTAL_CLUES}
        </p>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
            const clue = foundClues[i];
            const isNew = newIdx === i;
            return (
              <div
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-[9px] text-[15px] font-semibold tabular-nums transition-[transform,background-color] duration-300 ${
                  clue
                    ? isNew
                      ? 'scale-110 bg-red-500 text-white'
                      : 'bg-red-600 text-white'
                    : 'bg-[#f0f0f2] text-gray-400'
                }`}
              >
                {clue ? clue.digit : <span className="text-[12px]">?</span>}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-center text-[11px] text-primary">Ver el sorteo ›</p>
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
        const isVisible = data?.visible === undefined ? true : Boolean(data.visible);
        const isActive = Boolean(data?.active) && isVisible;
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
    const wasSaved = saveClue({ id: clueId, label, path: pathname, position, digit });
    if (wasSaved) setSaved(true);
  };

  if (!active || pathname.startsWith('/admin')) return null;

  return (
    <span
      onMouseEnter={handleHover}
      onMouseLeave={() => setHovered(false)}
      title={saved ? `Pista encontrada · ${digit}` : 'Pasá el mouse para revelar la pista'}
      className={`inline-flex cursor-default select-none items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-black transition duration-300 ${
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
