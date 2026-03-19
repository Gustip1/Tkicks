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
const CLUE_SEQUENCE = ['2', '6', '0', '7', '0', '5'];
const STORAGE_KEY = 'tkicks_giveaway_found_paths';

// ─── Textos de investigación ──────────────────────────────────────────────────

const FAIL_TEXTS = [
  "El catálogo se extiende ante vos como un laberinto. Hay algo oculto, pero todavía no lograste verlo. Seguís.",
  "Una vibración en el aire. Como si alguien hubiera estado aquí hace poco. Nada concreto por ahora.",
  "Demasiado ruido. Demasiados productos, demasiadas pistas falsas. El código se esconde bien.",
  "La tienda tiene sus secretos. Hoy no te quiso revelar ninguno. Intentá de nuevo.",
  "Algo no encaja, pero todavía no podés identificarlo. La respuesta está más cerca de lo que creés.",
  "Las sombras del catálogo se mueven. Nada te llama la atención esta vez. Seguís buscando.",
  "El pasillo digital está silencioso. Quizás debas mirar en otro sector.",
];

// Textos de éxito por posición (no revelan el dígito, solo la narrativa)
const SUCCESS_TEXTS: Record<number, string> = {
  0: "En la entrada del sitio, casi invisible entre el ruido visual, una marca que nadie nota a simple vista. La primera cifra del código es tuya.",
  1: "El catálogo completo esconde más de lo que muestra. En la sección principal, entre cientos de productos, algo estaba esperando que lo encontraras.",
  2: "Las ofertas ocultan más de lo que venden. Una pista discreta, mezclada entre descuentos y etiquetas rojas. Ahora es tuya.",
  3: "El formulario de encargos. Una pieza de información que casi nadie lee con atención. Vos sí. La cifra te pertenece.",
  4: "Quiénes somos... La sección de identidad guarda una cifra que lo define todo. La encontraste donde menos se esperaba.",
  5: "Las zapatillas más nuevas del catálogo. El par que llegó último tenía la respuesta escondida en su ficha. Ahora completás el mapa.",
};

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

function saveClue(clue: Omit<FoundClue, 'foundAt'>) {
  try {
    const found = readClues();
    if (found.some((c) => c.id === clue.id)) return;
    const next: FoundClue = { ...clue, foundAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...found, next]));
    window.dispatchEvent(new CustomEvent('tkicks-clue-found'));
  } catch {}
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SorteoPage() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Clues — ordenadas por foundAt (orden de descubrimiento)
  const [foundClues, setFoundClues] = useState<FoundClue[]>([]);

  // Investigación
  const [investigating, setInvestigating] = useState(false);
  const [investigationText, setInvestigationText] = useState<string | null>(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [lastFoundPos, setLastFoundPos] = useState<number | null>(null);

  // Código y participación
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [codeValidated, setCodeValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ok, setOk] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // byPos: primera pista encontrada por posición
  const byPos = new Map<number, FoundClue>();
  foundClues.forEach((c) => { if (!byPos.has(c.position)) byPos.set(c.position, c); });
  const foundCount = byPos.size;

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

  // Escuchar evento de badge hover (actualizar clues en tiempo real)
  useEffect(() => {
    const handler = () => refreshClues();
    window.addEventListener('tkicks-clue-found', handler);
    return () => window.removeEventListener('tkicks-clue-found', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autocompletar código cuando se tienen todas las pistas
  useEffect(() => {
    if (byPos.size === TOTAL_CLUES) {
      const full = Array.from({ length: TOTAL_CLUES }, (_, i) => byPos.get(i)?.digit ?? '').join('');
      if (!full.includes('')) setCode(full);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundClues]);

  // ─── Mecánica de investigación ──────────────────────────────────────────────

  const handleInvestigate = () => {
    if (investigating) return;
    setInvestigating(true);
    setInvestigationText(null);
    setLastFoundPos(null);

    setTimeout(() => {
      const unfoundPositions = Array.from({ length: TOTAL_CLUES }, (_, i) => i)
        .filter((i) => !byPos.has(i));

      if (unfoundPositions.length === 0) {
        setInvestigationText("Ya descubriste todas las pistas. El código está completo. Es momento de actuar.");
        setInvestigating(false);
        return;
      }

      // Éxito garantizado a partir del 3er fallo consecutivo
      const successRate = consecutiveFails >= 2 ? 1 : 0.5;
      const success = Math.random() < successRate;

      if (success) {
        // Seleccionar una posición no encontrada al azar
        const pos = unfoundPositions[Math.floor(Math.random() * unfoundPositions.length)];
        const digit = CLUE_SEQUENCE[pos];
        saveClue({
          id: `sorteo:pos${pos}`,
          label: `Investigación · pista ${pos + 1}`,
          path: '/sorteo',
          position: pos,
          digit,
        });
        refreshClues();
        setLastFoundPos(pos);
        setConsecutiveFails(0);
        setInvestigationText(SUCCESS_TEXTS[pos]);
      } else {
        setConsecutiveFails((n) => n + 1);
        const txt = FAIL_TEXTS[Math.floor(Math.random() * FAIL_TEXTS.length)];
        setInvestigationText(txt);
      }

      setInvestigating(false);
    }, 1400); // Pausa dramática
  };

  // ─── Validación de código ───────────────────────────────────────────────────

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
      if (!res.ok) { setMessage(data?.error || 'El código no es correcto.'); return; }
      setCodeValidated(true);
      setOk(true);
      setMessage('Código correcto. Dejá tu teléfono para participar.');
    } catch {
      setMessage('Error de conexión. Intentá nuevamente.');
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
      if (!res.ok) { setMessage(data?.error || 'No se pudo registrar.'); return; }
      setOk(true);
      setMessage(
        data?.alreadyRegistered
          ? 'Ya estabas registrado con ese teléfono.'
          : 'Participación registrada. Serás contactado si resultás ganador.'
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
        <img src="/logo.jpg" alt="Tkicks" className="mx-auto h-16 w-auto rounded-2xl opacity-40" />
        <h1 className="mt-8 text-2xl font-black uppercase tracking-[0.15em] text-white">
          Nada que ver aquí.
        </h1>
        <p className="mt-3 text-sm font-bold text-zinc-600">Por ahora.</p>
      </div>
    );
  }

  // ─── Activo ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <div className="space-y-4">

        {/* ── Escenario ────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-red-500">Sorteo activo</p>
          </div>
          <h1 className="text-lg font-black uppercase tracking-tight text-white">
            El código está ahí afuera.
          </h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-500">
            Seis cifras, dispersas por el sitio. Algunas en productos, otras donde menos las esperás.
            Pasá el mouse sobre la pista <span className="text-red-500/80">◈ fecha</span> cuando la encuentres,
            o investigá directamente desde acá. El orden en que las descubrís no es el orden del código.
          </p>
        </div>

        {/* ── Investigar ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
            Investigar
          </p>

          <button
            onClick={handleInvestigate}
            disabled={investigating || foundCount === TOTAL_CLUES}
            className={`w-full rounded-xl border py-3.5 text-sm font-black uppercase tracking-wider transition-all duration-200 ${
              investigating
                ? 'border-zinc-700 bg-zinc-900 text-zinc-600 cursor-wait'
                : foundCount === TOTAL_CLUES
                ? 'border-zinc-800 bg-zinc-950 text-zinc-700 cursor-default'
                : 'border-red-500/30 bg-red-500/5 text-red-500 hover:border-red-500/60 hover:bg-red-500/10'
            }`}
          >
            {investigating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-red-500" />
                Buscando...
              </span>
            ) : foundCount === TOTAL_CLUES ? (
              'Búsqueda completa'
            ) : (
              '◈ Investigar'
            )}
          </button>

          {investigationText && (
            <div className={`mt-3 rounded-xl border p-4 transition-all duration-300 ${
              lastFoundPos !== null
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-zinc-800 bg-black/40'
            }`}>
              {lastFoundPos !== null && (
                <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-red-500">
                  — Pista encontrada —
                </p>
              )}
              <p className="text-sm font-bold leading-relaxed text-zinc-300 italic">
                "{investigationText}"
              </p>
              {lastFoundPos !== null && (
                <p className="mt-2 text-xs font-black text-red-400">
                  Cifra {lastFoundPos + 1} del código · {CLUE_SEQUENCE[lastFoundPos]}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Pistas descubiertas ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
              Pistas descubiertas
            </p>
            <p className="text-[9px] font-bold text-zinc-600">
              <span className={foundCount > 0 ? 'text-red-500 font-black' : ''}>{foundCount}</span>/{TOTAL_CLUES}
            </p>
          </div>

          {/* Lista en ORDEN DE DESCUBRIMIENTO (no orden del código) */}
          {foundClues.length === 0 ? (
            <p className="text-xs font-bold italic text-zinc-700">
              Ninguna todavía. La búsqueda acaba de comenzar.
            </p>
          ) : (
            <div className="space-y-2">
              {foundClues.map((clue, idx) => (
                <div
                  key={clue.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black/40 px-3 py-2"
                >
                  <span className="text-[9px] font-black text-zinc-700">#{idx + 1}</span>
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-red-500 text-sm font-black text-white shadow shadow-red-900/50">
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

          {/* Recordatorio: las pistas no están en orden del código */}
          {foundClues.length > 0 && foundClues.length < TOTAL_CLUES && (
            <p className="mt-3 text-[10px] font-bold italic text-zinc-700">
              Las pistas no aparecen en el orden del código. Tendrás que reordenarlas.
            </p>
          )}
        </div>

        {/* ── Ensamblador del código ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="mb-3 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
            Clave final
          </p>

          {/* Slots en orden correcto (posición 0→5) para que el usuario arme el código */}
          <div className="mb-4 flex justify-center gap-1.5">
            {Array.from({ length: TOTAL_CLUES }).map((_, i) => {
              const clue = byPos.get(i);
              return (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-black transition-all duration-300 ${
                    clue
                      ? 'border-red-500/50 bg-red-500/10 text-red-400 shadow shadow-red-900/20'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-800'
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
              placeholder="Ingresá la clave"
              disabled={codeValidated}
              required
              className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-center text-lg font-black tracking-[0.4em] text-red-500 placeholder:tracking-normal placeholder:text-zinc-800 focus:border-red-500 focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={submitting || codeValidated}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:border-white hover:bg-zinc-800 disabled:opacity-40"
            >
              {submitting ? 'Verificando...' : codeValidated ? '✓ Clave verificada' : 'Verificar clave'}
            </button>
          </form>

          {codeValidated && (
            <form onSubmit={handleRegister} className="mt-3 space-y-2">
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
            <div className={`mt-3 rounded-xl border px-4 py-3 ${
              ok ? 'border-green-900/50 bg-green-950/20' : 'border-zinc-800 bg-black'
            }`}>
              {ok && <span className="mr-2 text-green-500">✓</span>}
              <span className="text-sm font-bold italic text-zinc-300">{message}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
