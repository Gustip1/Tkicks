"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    
    if (profile?.role === 'admin') {
      router.push('/admin');
    } else {
      setError('No tienes permisos de administrador');
      await supabase.auth.signOut();
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Admin - Iniciar sesión</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Acceso exclusivo para administradores
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400 focus:border-neutral-500"
            placeholder="admin@tkicks.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400 focus:border-neutral-500"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded border border-red-700/40 bg-red-900/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {loading ? 'Iniciando...' : 'Iniciar sesión como Admin'}
        </button>
      </form>
    </div>
  );
}