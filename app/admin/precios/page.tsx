"use client";
import { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export default function BulkPricingPage() {
  const supabase = createBrowserClient();
  const [mode, setMode] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const apply = async () => {
    setMessage(null);
    setConfirming(false);
    // Actualización masiva usando la función SQL bulk_update_prices
    const { error } = await supabase.rpc('bulk_update_prices', {
      p_mode: mode,
      p_value: value,
      p_category: category || null
    });
    if (error) setMessage(error.message);
    else setMessage('Precios actualizados');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Precios (Bulk)</h1>
      <div className="grid max-w-xl grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-white">Modo</label>
          <select className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="percent">% Porcentaje</option>
            <option value="fixed">$ Fijo</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Valor</label>
          <input className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Categoría</label>
          <select className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas</option>
            <option value="sneakers">Sneakers</option>
            <option value="streetwear">Streetwear</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setConfirming(true)} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Aplicar</button>
        {message && <span className="text-sm">{message}</span>}
      </div>
      {confirming && (
        <div className="rounded border border-yellow-700/40 bg-yellow-900/10 p-3 text-sm text-white">
          <p>¿Confirmás actualizar precios? Esto afectará a los productos seleccionados.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={apply} className="rounded bg-green-600 px-3 py-1 text-white">Confirmar</button>
            <button onClick={() => setConfirming(false)} className="rounded bg-neutral-800 px-3 py-1 text-white">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}


