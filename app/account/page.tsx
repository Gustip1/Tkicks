"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  role: string;
  display_name: string | null;
  created_at: string;
}

export default function AccountPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      setProfile(profileData);
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-neutral-400">Cargando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Mi cuenta</h1>
        <button
          onClick={handleLogout}
          className="rounded bg-neutral-800 px-3 py-1 text-sm text-white hover:bg-neutral-700"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
          <h2 className="text-lg font-semibold text-white">Información personal</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Nombre:</span>
              <span className="text-white">{profile?.display_name || 'No especificado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Email:</span>
              <span className="text-white">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Registrado:</span>
              <span className="text-white">
                {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded border border-neutral-800 bg-neutral-950 p-4">
          <h2 className="text-lg font-semibold text-white">Acciones rápidas</h2>
          <div className="mt-3 space-y-2">
            <Link
              href="/orders"
              className="block rounded bg-neutral-800 px-3 py-2 text-sm text-white hover:bg-neutral-700"
            >
              Ver mis pedidos
            </Link>
            <Link
              href="/track"
              className="block rounded bg-neutral-800 px-3 py-2 text-sm text-white hover:bg-neutral-700"
            >
              Seguir pedido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
