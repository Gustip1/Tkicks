"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          role: 'user',
          display_name: displayName
        });

      if (profileError) {
        setError('Error creando perfil: ' + profileError.message);
        setLoading(false);
        return;
      }

      router.push('/account');
    }

    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Registrate para seguir tus pedidos y más
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white">Nombre</label>
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400 focus:border-neutral-500"
            placeholder="Tu nombre"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400 focus:border-neutral-500"
            placeholder="tu@email.com"
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
            minLength={6}
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
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <div className="text-center text-sm text-neutral-400">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-white hover:underline">
          Iniciar sesión
        </Link>
      </div>

      <div className="mt-6">
        <button
          onClick={async () => {
            setError(null);
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin}/account` } });
            if (error) setError(error.message);
          }}
          className="w-full rounded bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Continuar con Google
        </button>
      </div>
    </div>
  );
}
