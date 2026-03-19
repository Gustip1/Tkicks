"use client";
import { useEffect, useState } from 'react';

type Winner = {
  phone: string;
  created_at: string;
  source_path?: string;
};

export default function AdminSorteoPage() {
  const [active, setActive] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/sorteo', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) return;
      setActive(Boolean(data?.active));
      setWinners(Array.isArray(data?.winners) ? data.winners : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const setSorteo = async (value: boolean) => {
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/sorteo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: value }),
      });
      if (!res.ok) {
        alert('No se pudo actualizar el sorteo');
      }
      await loadData();
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sorteo</h1>
        <p className="text-sm text-gray-600 mt-1">Código configurado: <span className="font-black text-red-600">260705</span></p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-gray-800">Estado actual</p>
            <p className={`text-xs font-bold ${active ? 'text-green-600' : 'text-gray-500'}`}>
              {active ? 'ACTIVO' : 'INACTIVO'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSorteo(true)}
              disabled={updating}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Activar sorteo
            </button>
            <button
              onClick={() => setSorteo(false)}
              disabled={updating}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Cancelar sorteo
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Cuando está activo, se muestran pistas numéricas en la web y la página /sorteo permite validar el código.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Ganadores / Participantes correctos</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : winners.length === 0 ? (
          <p className="text-sm text-gray-500">Todavía no hay participantes con código correcto.</p>
        ) : (
          <div className="space-y-2">
            {winners.map((w, idx) => (
              <div key={`${w.phone}-${idx}`} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-bold text-gray-900">{w.phone}</p>
                <p className="text-xs text-gray-500">{new Date(w.created_at).toLocaleString('es-AR')}</p>
                <p className="text-xs text-gray-500">Origen: {w.source_path || '/'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
