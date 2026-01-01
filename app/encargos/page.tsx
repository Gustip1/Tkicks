"use client";
import { useState } from 'react';

export default function EncargosPage() {
  const [message, setMessage] = useState('');

  const handleWhatsApp = () => {
    const text = message.trim() || '¡Hola! Quiero hacer un pedido personalizado.';
    const url = `https://api.whatsapp.com/send?phone=5492644802994&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setMessage('');
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Encargos Personalizados</h1>
        <p className="mt-2 text-sm text-neutral-400">
          ¿Buscas algo específico? Escribinos tu pedido y te contactaremos por WhatsApp.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Detalles de tu pedido
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Ej: Busco unas Jordan 1 Retro High talle 42 en color negro y rojo..."
            className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-neutral-500"
          />
          <p className="mt-2 text-xs text-neutral-500">
            Dejá en blanco para enviar un mensaje genérico
          </p>
        </div>

        <button
          onClick={handleWhatsApp}
          className="w-full inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700"
        >
          Enviar pedido por WhatsApp
        </button>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
        <h2 className="text-sm font-semibold text-white mb-2">¿Qué puedo encargar?</h2>
        <ul className="space-y-1 text-xs text-neutral-400">
          <li>• Productos no disponibles en el catálogo</li>
          <li>• Talles específicos que no tenemos en stock</li>
          <li>• Consultas sobre próximos lanzamientos</li>
        </ul>
      </div>
    </div>
  );
}


