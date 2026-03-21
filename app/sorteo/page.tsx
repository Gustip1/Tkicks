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
  } catch { return []; }
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
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [foundClues, setFoundClues] = useState<FoundClue[]>([]);
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [codeValidated, setCodeValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // foundClues ordenado por foundAt — cada entrada es única por clueId.
  // El dígito '0' puede aparecer hasta 2 veces (como en el código 260705).
  const discoveryOrder = foundClues;
  const foundCount = foundClues.length;

  const refreshClues = () => {
    const clues = readClues().sort(
      (a, b) => new Date(a.foundAt).getTime() - new Date(b.foundAt).getTime()
    );
    setFoundClues(clues);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/sorteo/state', { cache: 'no-store' });
        const data = await res.json();
        if (!mounted) return;
        const isVisible = data?.visible === undefined ? true : Boolean(data.visible);
        setVisible(isVisible);
        const isActive = Boolean(data?.active);
        setActive(isActive);
        if (!isActive) {
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
        } else {
          refreshClues();
        }
      } catch {
        if (mounted) setActive(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => refreshClues();
    window.addEventListener('tkicks-clue-found', handler);
    return () => window.removeEventListener('tkicks-clue-found', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); setOk(false); setSubmitting(true);
    try {
      const res = await fetch('/api/sorteo/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data?.error || 'El código no es correcto.'); return; }
      setCodeValidated(true); setOk(true);
      setMessage('Código correcto. Dejá tu teléfono para participar.');
    } catch {
      setMessage('Error de conexión.');
    } finally { setSubmitting(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); setSubmitting(true);
    try {
      const res = await fetch('/api/sorteo/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, phone, firstName, lastName, sourcePath: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data?.error || 'No se pudo registrar.'); return; }
      setOk(true);
      setMessage(
        data?.alreadyRegistered
          ? 'Ya estabas registrado con ese teléfono.'
          : 'Participación registrada. Serás contactado si resultás ganador.'
      );
      setCode(''); setPhone(''); setFirstName(''); setLastName(''); setCodeValidated(false);
    } catch {
      setMessage('Error de conexión.');
    } finally { setSubmitting(false); }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500" />
      </div>
    );
  }

  if (!visible) {
    if (typeof window !== 'undefined') window.location.replace('/');
    return null;
  }

  // ─── Inactivo ─────────────────────────────────────────────────────────────

  if (!active) {
    return (
      <div className="relative mx-auto max-w-lg overflow-hidden px-4 py-20 text-center">
        {/* Glow de fondo */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/10 blur-3xl" />

        <img src="/logo.jpg" alt="Tkicks" className="relative mx-auto h-16 w-auto rounded-2xl opacity-60" />

        <p className="relative mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-red-500/70">
          Tkicks · Sorteo
        </p>
        <h1 className="relative mt-3 text-5xl font-black uppercase leading-none tracking-tight text-white">
          Muy<br />pronto.
        </h1>
        <p className="relative mt-5 text-sm font-bold leading-relaxed text-zinc-500">
          Algo se está cocinando. Explorá el sitio,<br />
          buscá las pistas <span className="text-red-500/70">◈ pista</span> y preparate.
        </p>

        <div className="relative mt-8 flex justify-center gap-3">
          <span className="inline-block h-1 w-8 rounded-full bg-zinc-800" />
          <span className="inline-block h-1 w-4 rounded-full bg-red-500/40" />
          <span className="inline-block h-1 w-8 rounded-full bg-zinc-800" />
        </div>
      </div>
    );
  }

  // ─── Activo (día del sorteo) ──────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="space-y-3">

        {/* ── Hero del día ─────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-red-500/20 bg-zinc-950 p-6 text-center">
          {/* Glow */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/15 blur-3xl" />

          <p className="relative text-[9px] font-black uppercase tracking-[0.3em] text-red-500">
            ◈ · Sorteo Tkicks · ◈
          </p>
          <h1 className="relative mt-2 text-6xl font-black uppercase leading-none tracking-tighter text-white">
            Hoy.
          </h1>
          <p className="relative mt-3 text-sm font-bold leading-relaxed text-zinc-400">
            El día llegó. Si encontraste las seis pistas, armá el código<br className="hidden sm:block" />
            y confirmá tu participación antes de que cierre.
          </p>

          {/* Barra de progreso */}
          <div className="relative mt-5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Tu progreso</span>
              <span className="text-[9px] font-black text-zinc-500">
                <span className={foundCount > 0 ? 'text-red-400' : ''}>{foundCount}</span>/{TOTAL_CLUES} pistas
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-700"
                style={{ width: `${(foundCount / TOTAL_CLUES) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Pistas descubiertas (orden de descubrimiento) ────────────────── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
              Pistas descubiertas
            </p>
            <p className="text-[9px] italic text-zinc-700">en orden de hallazgo</p>
          </div>

          {/* Slots visuales — orden de descubrimiento */}
          <div className="mb-3 flex justify-center gap-1.5">
            {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
              const clue = discoveryOrder[i];
              return (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-black transition-all duration-300 ${
                    clue
                      ? 'border-red-500/50 bg-red-500/10 text-red-400'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-800'
                  }`}
                >
                  {clue ? clue.digit : '·'}
                </div>
              );
            })}
          </div>

          {foundClues.length === 0 ? (
            <p className="text-center text-xs font-bold italic text-zinc-700">
              Ninguna todavía. Explorá el sitio y buscá ◈ pista.
            </p>
          ) : (
            <div className="space-y-1.5">
              {discoveryOrder.map((clue, idx) => (
                <div
                  key={clue.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-black/30 px-3 py-2"
                >
                  <span className="w-4 text-[9px] font-black text-zinc-700">#{idx + 1}</span>
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-red-500 text-sm font-black text-white">
                    {clue.digit}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black text-zinc-400">{clue.label}</p>
                    <p className="text-[9px] text-zinc-700">{formatDate(clue.foundAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {foundCount > 0 && foundCount < TOTAL_CLUES && (
            <p className="mt-3 text-center text-[9px] italic text-zinc-700">
              Este no es el orden del código — tenés que reordenarlo.
            </p>
          )}
        </div>

        {/* ── Ingresar la clave ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
            Ingresar clave
          </p>

          <form onSubmit={handleCheckCode} className="space-y-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.slice(0, 6))}
              maxLength={6}
              placeholder="······"
              disabled={codeValidated}
              required
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3.5 text-center text-2xl font-black tracking-[0.5em] text-red-500 placeholder:tracking-[0.3em] placeholder:text-zinc-800 focus:border-red-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={submitting || codeValidated}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
            >
              {submitting ? 'Verificando...' : codeValidated ? '✓ Clave verificada' : 'Verificar clave'}
            </button>
          </form>

          {codeValidated && (
            <form onSubmit={handleRegister} className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nombre"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white placeholder:text-zinc-700 focus:border-white focus:outline-none"
                />
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Apellido"
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white placeholder:text-zinc-700 focus:border-white focus:outline-none"
                />
              </div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Tu teléfono de contacto"
                required
                className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm font-bold text-white placeholder:text-zinc-700 focus:border-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Registrando...' : 'Confirmar participación'}
              </button>
            </form>
          )}

          {(ok || message) && (
            <div className={`mt-3 rounded-xl border px-4 py-3 ${ok ? 'border-green-900/50 bg-green-950/20' : 'border-zinc-800 bg-black'}`}>
              {ok && <span className="mr-2 text-green-500">✓</span>}
              <span className="text-sm font-bold italic text-zinc-300">{message}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
