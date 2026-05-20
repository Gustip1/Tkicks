'use client';
import { useEffect } from 'react';

export default function PrintButton() {
  useEffect(() => {
    // Auto-print cuando se abre la página
    const t = setTimeout(() => window.print(), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      onClick={() => window.print()}
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 9999,
        background: '#111', color: '#fff', border: 'none',
        padding: '10px 22px', borderRadius: 6, fontSize: 14,
        cursor: 'pointer', fontFamily: 'Arial, sans-serif',
      }}
    >
      Imprimir / Guardar PDF
    </button>
  );
}
