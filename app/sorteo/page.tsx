"use client";
import { useEffect, useMemo, useState } from 'react';

type FoundClue = {
  id: string;
  label: string;
  path?: string;
  digit: string;
  foundAt: string;
};

const TOTAL_CLUES = 6;
const STORAGE_KEY = 'tkicks_giveaway_found_paths';

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
    return (parsed as FoundClue[]).filter((item) => Boolean(item?.id));
  } catch {
    return [];
  }
}

function formatFoundMoment(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SorteoPage() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [codeValidated, setCodeValidated] = useState(false);
  const [ok, setOk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [foundClues, setFoundClues] = useState<FoundClue[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const foundCount = foundClues.length;

  const selectedClue = useMemo(
    () => (selectedIndex !== null ? foundClues[selectedIndex] ?? null : null),
    [foundClues, selectedIndex]
  );

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
          setSelectedIndex(null);
        }
      } catch {
        if (mounted) setActive(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!active) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const found = normalizeClues(raw).sort(
        (a, b) => new Date(a.foundAt).getTime() - new Date(b.foundAt).getTime()
      );
      setFoundClues(found);
      if (found.length > 0) setSelectedIndex(0);
    } catch {
      setFoundClues([]);
    }
  }, [active]);

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
      if (!res.ok) {
        setMessage(data?.error || 'No se pudo validar el código');
        return;
      }
      setCodeValidated(true);
      setOk(true);
      setMessage('Código correcto. Ahora dejá tu teléfono para participar.');
    } catch {
      setMessage('Error de conexión, intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterWinner = async (e: React.FormEvent) => {
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
      if (!res.ok) {
        setMessage(data?.error || 'No se pudo registrar tu participación');
        return;
      }
      setOk(true);
      setMessage(
        data?.alreadyRegistered
          ? 'Ya estabas registrado en el sorteo con ese teléfono.'
          : '¡Listo! Quedaste registrado como participante ganador.'
      );
      setCode('');
      setPhone('');
      setCodeValidated(false);
    } catch {
      setMessage('Error de conexión, intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500" />
          <p className="text-xs font-bold tracking-widest text-zinc-600 uppercase">Cargando</p>
        </div>
      </div>
    );
  }

  // ─── Inactivo ────────────────────────────────────────────────────────────

  if (!active) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <img src="/logo.jpg" alt="Tkicks" className="mx-auto h-20 w-auto rounded-2xl opacity-60" />
        <h1 className="mt-8 text-3xl font-black uppercase tracking-tight text-white">Coming Soon</h1>
        <p className="mt-3 text-sm font-bold text-zinc-500">El sorteo no está activo por el momento.</p>
      </div>
    );
  }

  // ─── Activo ──────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-xl py-10 px-4">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">

        {/* Header */}
        <div className="text-center">
          <img src="/logo.jpg" alt="Tkicks" className="mx-auto h-16 w-auto rounded-xl" />
          <span className="mt-4 inline-flex rounded-full border border-red-600/50 bg-red-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
            Sorteo Activo
          </span>
          <h1 className="mt-3 text-2xl font-black uppercase tracking-tight text-white">
            Encontrá las pistas
          </h1>
          <p className="mt-2 text-sm font-bold text-zinc-500">
            Buscá la pista <span className="text-red-500 font-black">fecha</span> escondida en productos y secciones. Pasá el mouse para revelarla.
          </p>
        </div>

        {/* Slots de pistas */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Pistas encontradas</p>
            <p className="text-[10px] font-black text-zinc-500">
              <span className={foundCount > 0 ? 'text-red-500' : 'text-zinc-400'}>{foundCount}</span>
              <span className="text-zinc-600">/{TOTAL_CLUES}</span>
            </p>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
              const clue = foundClues[i];
              const isSelected = selectedIndex === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!clue}
                  onClick={() => clue && setSelectedIndex(i)}
                  className={`relative flex flex-col items-center justify-center rounded-xl border py-3 transition-all duration-200 ${
                    clue
                      ? isSelected
                        ? 'border-red-500 bg-red-500/15 shadow-sm shadow-red-900/30'
                        : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800'
                      : 'border-zinc-800 bg-zinc-950 opacity-50'
                  }`}
                >
                  <span
                    className={`text-xl font-black leading-none ${
                      clue
                        ? isSelected
                          ? 'text-red-400'
                          : 'text-white'
                        : 'text-zinc-700'
                    }`}
                  >
                    {clue ? clue.digit : '?'}
                  </span>
                  <span className="mt-1 text-[8px] font-bold uppercase tracking-wider text-zinc-600">
                    {clue ? `#${i + 1}` : `···`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Detalle de pista seleccionada */}
          {selectedClue && (
            <div className="mt-3 rounded-xl border border-zinc-800 bg-black/60 px-3.5 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Detalle</p>
              <p className="mt-1 text-xs font-bold text-zinc-300">
                <span className="text-red-400">Pista #{(selectedIndex ?? 0) + 1}</span>
                {selectedClue.label ? ` · ${selectedClue.label}` : ''}
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-zinc-600">
                Encontrada el {formatFoundMoment(selectedClue.foundAt)}
              </p>
            </div>
          )}

          {foundCount === 0 && (
            <div className="mt-3 rounded-xl border border-zinc-800 bg-black/40 px-3.5 py-3 text-center">
              <p className="text-xs font-bold text-zinc-600">
                Buscá la pista <span className="text-red-500">fecha</span> en la web y pasá el mouse para guardarla.
              </p>
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="mt-6 border-t border-zinc-800 pt-6">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            Ingresá el código
          </p>
          <form onSubmit={handleCheckCode} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="_ _ _ _ _ _"
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-center text-lg font-black tracking-[0.4em] text-red-500 placeholder:tracking-[0.3em] placeholder:text-zinc-700 focus:border-red-500 focus:outline-none disabled:opacity-50"
              required
              disabled={codeValidated}
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
            <form onSubmit={handleRegisterWinner} className="mt-3 space-y-3">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Tu teléfono para contactarte"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
                required
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
            <div className={`mt-4 rounded-xl border px-4 py-3 ${ok ? 'border-green-800/50 bg-green-950/30' : 'border-zinc-800 bg-black'}`}>
              {ok && <p className="text-lg font-black text-green-500">✓</p>}
              {message && <p className="text-sm font-bold text-zinc-300">{message}</p>}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
