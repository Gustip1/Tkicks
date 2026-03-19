"use client";
import { useEffect, useState } from 'react';

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

  const totalClues = 6;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/sorteo/state', { cache: 'no-store' });
        const data = await res.json();
        if (!mounted) return;
        setActive(Boolean(data?.active));
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
      const parsed = raw ? JSON.parse(raw) : [];
      const found = Array.isArray(parsed) ? parsed : [];
      setFoundCount(found.length);
    } catch {
      setFoundCount(0);
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
          Buscá las pistas rojas en toda la web, armá el código y ganate la remera.
        </p>
        <div className="mt-4 grid gap-2 rounded-xl border border-zinc-800 bg-black p-3 text-left sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Pista general</p>
            <p className="text-xs font-bold text-zinc-300">Las pistas están distribuidas por toda la web.</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Tu progreso</p>
            <p className="text-sm font-black text-red-500">{foundCount}/{totalClues} pistas encontradas</p>
          </div>
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
