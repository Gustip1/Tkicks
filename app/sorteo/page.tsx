"use client";
import { useEffect, useMemo, useState } from 'react';

type FoundClue = {
  id: string;
  label: string;
  path?: string;
  digit: string;
  foundAt: string;
};

const PATH_LABELS: Record<string, string> = {
  '/': 'Inicio',
  '/productos': 'Productos',
  '/ofertas': 'Ofertas',
  '/encargos': 'Encargos',
  '/nosotros': 'Nosotros',
  '/nuevos-ingresos': 'Nuevos ingresos',
};

const CLUE_DIGITS_BY_PATH: Record<string, string> = {
  '/': '2',
  '/productos': '6',
  '/ofertas': '0',
  '/encargos': '7',
  '/nosotros': '0',
  '/nuevos-ingresos': '5',
};

function normalizeClues(raw: string | null): FoundClue[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (parsed.every((item) => typeof item === 'string')) {
      return (parsed as string[]).map((path) => ({
        id: path,
        label: PATH_LABELS[path] || path,
        path,
        digit: CLUE_DIGITS_BY_PATH[path] || '?',
        foundAt: new Date().toISOString(),
      }));
    }
    return (parsed as FoundClue[]).filter((item) => Boolean(item?.id));
  } catch {
    return [];
  }
}

function formatFoundMoment(iso?: string) {
  if (!iso) return 'Momento no disponible';
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
  const [foundCount, setFoundCount] = useState(0);
  const [foundClues, setFoundClues] = useState<FoundClue[]>([]);
  const [selectedCluePath, setSelectedCluePath] = useState<string | null>(null);

  const totalClues = 6;
  const selectedClue = useMemo(
    () => foundClues.find((item) => item.id === selectedCluePath) || null,
    [foundClues, selectedCluePath]
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
          try {
            localStorage.removeItem('tkicks_giveaway_found_paths');
          } catch {}
          setFoundCount(0);
          setFoundClues([]);
          setSelectedCluePath(null);
        }
      } catch {
        if (mounted) setActive(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tkicks_giveaway_found_paths');
      const found = normalizeClues(raw);
      setFoundCount(found.length);
      setFoundClues(found);
      if (found.length > 0) setSelectedCluePath(found[0].id);
    } catch {
      setFoundCount(0);
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
      if (data?.alreadyRegistered) {
        setMessage('Ya estabas registrado en el sorteo con ese teléfono.');
      } else {
        setMessage('¡Listo! Quedaste registrado como participante ganador.');
      }
      setCode('');
      setPhone('');
      setCodeValidated(false);
    } catch {
      setMessage('Error de conexión, intentá nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-zinc-400">Cargando sorteo...</div>;
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <img src="/logo.jpg" alt="Tkicks" className="mx-auto h-24 w-auto rounded-2xl" />
        <h1 className="mt-6 text-3xl font-black uppercase tracking-tight text-white">Coming Soon</h1>
        <p className="mt-3 text-sm font-bold text-zinc-400">Sorteo desactivado por el momento.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-10">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 text-center">
        <img src="/logo.jpg" alt="Tkicks" className="mx-auto h-20 w-auto rounded-xl" />
        <p className="mt-4 inline-flex rounded-full border border-red-600/60 bg-red-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-red-500">
          Sorteo Activo
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white">Coming Soon</h1>
        <p className="mt-2 text-sm font-bold text-zinc-400">
          Buscá las pistas visuales en páginas clave de la web, armá el código y ganate la remera.
        </p>
        <div className="mt-4 grid gap-2 rounded-xl border border-zinc-800 bg-black p-3 text-left sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Pista general</p>
            <p className="text-xs font-bold text-zinc-300">Explorá Inicio, Productos, Ofertas, Encargos, Nosotros y Nuevos ingresos.</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Tu progreso</p>
            <p className="text-sm font-black text-red-500">{foundCount}/{totalClues} pistas encontradas</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-zinc-800 bg-black p-3 text-left">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Números encontrados</p>
          {foundClues.length === 0 ? (
            <p className="mt-1 text-xs font-bold text-zinc-400">Todavía no encontraste pistas.</p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {foundClues.map((clue) => (
                  <button
                    key={clue.id}
                    type="button"
                    onClick={() => setSelectedCluePath(clue.id)}
                    className={`rounded-md border px-2 py-1 text-[11px] font-black uppercase tracking-wider transition ${
                      selectedCluePath === clue.id
                        ? 'border-red-500 bg-red-500/10 text-red-400'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    {(clue.label || PATH_LABELS[clue.path || ''] || clue.id) + ' · ' + (clue.digit || '?')}
                  </button>
                ))}
              </div>
              <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Detalle</p>
                <p className="text-xs font-bold text-zinc-300">
                  {selectedCluePath && selectedClue
                    ? `Encontraste la pista ${selectedClue.digit || '?'} en ${selectedClue.label || PATH_LABELS[selectedClue.path || ''] || selectedClue.id} el ${formatFoundMoment(selectedClue.foundAt)}.`
                    : 'Seleccioná una pista para ver el número.'}
                </p>
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleCheckCode} className="mt-6 space-y-3 text-left">
          <div>
            <label className="mb-1 block text-xs font-black uppercase tracking-wider text-zinc-400">Código</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="Ingresá el código"
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-black tracking-[0.25em] text-red-500 placeholder:text-zinc-600 focus:border-red-500 focus:outline-none"
              required
              disabled={codeValidated}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || codeValidated}
            className="w-full rounded-xl bg-white px-4 py-3 text-sm font-black uppercase tracking-tight text-black transition hover:bg-zinc-200 disabled:opacity-60"
          >
            {submitting ? 'Validando...' : codeValidated ? 'Código validado' : 'Validar código'}
          </button>
        </form>

        {codeValidated && (
          <form onSubmit={handleRegisterWinner} className="mt-3 space-y-3 text-left">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wider text-zinc-400">Teléfono</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Tu número para contactarte"
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white placeholder:text-zinc-600 focus:border-white focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-black uppercase tracking-tight text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? 'Enviando...' : 'Confirmar participación'}
            </button>
          </form>
        )}

        {(ok || message) && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black px-4 py-3">
            {ok && <p className="text-2xl font-black text-green-500">✓</p>}
            {message && <p className="text-sm font-bold text-zinc-300">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
