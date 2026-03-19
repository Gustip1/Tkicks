"use client";
import { useEffect, useState } from 'react';

type FoundClue = {
  id: string;
  label: string;
  path?: string;
  position: number;
  digit: string;
  foundAt: string;
};

const TOTAL_CLUES = 6;
const STORAGE_KEY = 'tkicks_giveaway_found_paths';

function readClues(): FoundClue[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as FoundClue[]).filter(
      (item) => Boolean(item?.id) && item?.position !== undefined
    );
  } catch {
    return [];
  }
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SorteoPage() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [foundClues, setFoundClues] = useState<FoundClue[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [codeValidated, setCodeValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // byPos: primera pista encontrada por posición (un producto y una página
  // pueden tener la misma posición para confundir — aquí se toma la primera)
  const byPos = new Map<number, FoundClue>();
  foundClues.forEach((c) => { if (!byPos.has(c.position)) byPos.set(c.position, c); });
  const foundCount = byPos.size;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/sorteo/state', { cache: 'no-store' });
        const data = await res.json();
        if (!mounted) return;
        const isActive = Boolean(data?.active);
        setActive(isActive);
        if (!isActive) {
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          setFoundClues([]);
        } else {
          setFoundClues(readClues());
        }
      } catch {
        if (mounted) setActive(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Sincronizar código input con pistas encontradas cuando cambian
  useEffect(() => {
    const fullCode = Array.from({ length: TOTAL_CLUES }, (_, i) =>
      byPos.get(i)?.digit ?? ''
    ).join('');
    if (fullCode.length === TOTAL_CLUES && !fullCode.includes('')) {
      setCode(fullCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundClues]);

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setOk(false);
    setSubmitting(true);
    try {
      const res = await fetch('/api/sorteo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data?.error || 'Código incorrecto'); return; }
      setCodeValidated(true);
      setOk(true);
      setMessage('Código correcto. Dejá tu teléfono para participar.');
    } catch {
      setMessage('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/sorteo/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, phone, sourcePath: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data?.error || 'No se pudo registrar'); return; }
      setOk(true);
      setMessage(
        data?.alreadyRegistered
          ? 'Ya estabas registrado con ese teléfono.'
          : '¡Listo! Quedaste registrado como participante.'
      );
      setCode(''); setPhone(''); setCodeValidated(false);
    } catch {
      setMessage('Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500" />
      </div>
    );
  }

  // ─── Inactivo ─────────────────────────────────────────────────────────────

  if (!active) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <img src="/logo.jpg" alt="Tkicks" className="mx-auto h-16 w-auto rounded-2xl opacity-50" />
        <h1 className="mt-8 text-3xl font-black uppercase tracking-tight text-white">Coming Soon</h1>
        <p className="mt-3 text-sm font-bold text-zinc-600">El sorteo no está activo por el momento.</p>
      </div>
    );
  }

  // ─── Activo ───────────────────────────────────────────────────────────────

  const selectedClue = selected !== null ? byPos.get(selected) ?? null : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">

        {/* Header */}
        <div className="text-center">
          <img src="/logo.jpg" alt="Tkicks" className="mx-auto h-14 w-auto rounded-xl" />
          <span className="mt-3 inline-flex rounded-full border border-red-600/40 bg-red-500/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
            Sorteo Activo
          </span>
          <h1 className="mt-2 text-xl font-black uppercase tracking-tight text-white">Encontrá las pistas</h1>
          <p className="mt-1 text-xs font-bold text-zinc-600">
            Buscá la pista <span className="text-red-500">◈ fecha</span> en la web y pasá el mouse para revelarla.
          </p>
        </div>

        {/* ── Puzzle slots ───────────────────────────────────────────────── */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">Piezas del código</p>
            <p className="text-[9px] font-bold text-zinc-600">
              <span className={foundCount > 0 ? 'text-red-500 font-black' : ''}>{foundCount}</span>/{TOTAL_CLUES} encontradas
            </p>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
              const clue = byPos.get(i);
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => clue && setSelected(isSelected ? null : i)}
                  disabled={!clue}
                  className={`group flex flex-col items-center justify-center rounded-xl border py-3.5 transition-all duration-200 ${
                    clue
                      ? isSelected
                        ? 'border-red-500 bg-red-500/15 shadow-lg shadow-red-900/20'
                        : 'border-zinc-700 bg-zinc-900 hover:border-red-500/50 hover:bg-zinc-800'
                      : 'border-zinc-800/50 bg-zinc-950/50 opacity-40 cursor-default'
                  }`}
                >
                  {clue ? (
                    <>
                      <span className={`text-xl font-black leading-none ${isSelected ? 'text-red-400' : 'text-white'}`}>
                        {clue.digit}
                      </span>
                      <span className="mt-1 text-[7px] font-black uppercase tracking-widest text-red-500/60">✦</span>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-black leading-none text-zinc-700">?</span>
                      <span className="mt-1 text-[7px] font-black uppercase tracking-widest text-zinc-800">◈</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detalle de pieza seleccionada */}
          {selectedClue ? (
            <div className="mt-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Pieza #{(selected ?? 0) + 1}</p>
              <p className="mt-0.5 text-xs font-bold text-zinc-300">{selectedClue.label}</p>
              <p className="text-[10px] font-bold text-zinc-600">Encontrada: {formatDate(selectedClue.foundAt)}</p>
            </div>
          ) : foundCount === 0 ? (
            <div className="mt-2.5 rounded-xl border border-zinc-800/50 bg-black/30 px-3.5 py-2.5 text-center">
              <p className="text-[11px] font-bold text-zinc-600">
                Recorrés la web, encontrás <span className="text-red-500">◈ fecha</span> y pasás el mouse. Así de simple.
              </p>
            </div>
          ) : null}
        </div>

        {/* ── Ensamblador del código ─────────────────────────────────────── */}
        <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/50 p-4">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
            Armá el código
          </p>

          {/* Vista del código parcial / completo */}
          <div className="mb-4 flex justify-center gap-1.5">
            {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
              const clue = byPos.get(i);
              return (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-black transition-all duration-200 ${
                    clue
                      ? 'border-red-500/60 bg-red-500/10 text-red-400'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-700'
                  }`}
                >
                  {clue ? clue.digit : '·'}
                </div>
              );
            })}
          </div>

          <form onSubmit={handleCheckCode} className="space-y-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 6))}
              maxLength={6}
              placeholder="Ingresá el código"
              disabled={codeValidated}
              required
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-center text-lg font-black tracking-[0.4em] text-red-500 placeholder:tracking-normal placeholder:text-zinc-700 focus:border-red-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={submitting || codeValidated}
              className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black uppercase tracking-tight text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {submitting ? 'Validando…' : codeValidated ? '✓ Código validado' : 'Validar código'}
            </button>
          </form>

          {codeValidated && (
            <form onSubmit={handleRegister} className="mt-3 space-y-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Tu teléfono"
                required
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-black uppercase tracking-tight text-white transition hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Enviando…' : 'Confirmar participación'}
              </button>
            </form>
          )}

          {(ok || message) && (
            <div className={`mt-3 rounded-xl border px-4 py-3 ${ok ? 'border-green-800/40 bg-green-950/20' : 'border-zinc-800 bg-black'}`}>
              {ok && <span className="mr-2 text-green-500">✓</span>}
              <span className="text-sm font-bold text-zinc-300">{message}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
