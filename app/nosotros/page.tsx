import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Nosotros | Tkicks',
  description:
    'Conocé quiénes somos en Tkicks y mirá nuestro feed de Instagram con los posteos más recientes.',
};

type InstagramItem = {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp?: string;
};

async function getInstagramFeed(): Promise<InstagramItem[]> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;

  if (!accessToken || !userId) {
    return [];
  }

  const url = `https://graph.instagram.com/${userId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=9&access_token=${accessToken}`;

  try {
    const res = await fetch(url, {
      next: { revalidate: 600 },
    });

    if (!res.ok) return [];

    const data = (await res.json()) as { data?: InstagramItem[] };
    return data.data || [];
  } catch {
    return [];
  }
}

function formatDate(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function NosotrosPage() {
  const feed = await getInstagramFeed();
  const profileUrl = process.env.NEXT_PUBLIC_INSTAGRAM_PROFILE_URL || 'https://www.instagram.com/tkicks.sj';

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-black to-emerald-950 p-6 md:p-10">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
              Quiénes somos
            </p>
            <h1 className="text-3xl font-black leading-tight md:text-5xl">
              Somos Tkicks: cultura urbana, autenticidad y comunidad.
            </h1>
            <p className="max-w-2xl text-sm font-bold leading-relaxed text-zinc-300 md:text-base">
              Hola, somos Tkicks: el unico reseller de San Juan enfocado en streetwear y sneakers originales.
              Soy Gustavo y empecé este proyecto con una idea clara: traer a la provincia eso que durante años faltó
              en el mundo del hype. Hoy construimos una marca que mezcla selección real de producto, confianza y
              cercanía con la comunidad. Cada drop, cada video y cada post tienen el mismo objetivo: que vivas la
              cultura urbana con acceso a piezas auténticas y una experiencia a la altura.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/productos"
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-black uppercase tracking-tight text-black transition hover:bg-zinc-200"
              >
                Ver catálogo
              </Link>
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-zinc-600 bg-zinc-900 px-5 py-2.5 text-sm font-black uppercase tracking-tight text-white transition hover:border-zinc-400 hover:bg-zinc-800"
              >
                Instagram oficial
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Foco</p>
              <p className="mt-2 text-sm font-bold text-white">Streetwear y sneakers originales, sin vueltas</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Estilo</p>
              <p className="mt-2 text-sm font-bold text-white">Hype real, curaduría y lanzamientos clave</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4 sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Comunidad</p>
              <p className="mt-2 text-sm font-bold text-white">
                En @tkicks.sj compartimos producto real, outfits, videos y novedades para que estés siempre al día.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black">Feed de Instagram</h2>
            <p className="text-sm font-bold text-zinc-400">Se actualiza automáticamente con tus posteos más recientes.</p>
          </div>
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Ver perfil completo
          </a>
        </div>

        {feed.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-black p-6 text-center">
            <p className="text-sm font-bold text-zinc-300">
              No se pudo cargar el feed todavía. Configurá INSTAGRAM_USER_ID e INSTAGRAM_ACCESS_TOKEN en el servidor.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((item) => {
              const preview = item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url;
              return (
                <a
                  key={item.id}
                  href={item.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-2xl border border-zinc-800 bg-black transition hover:-translate-y-1 hover:border-zinc-600"
                >
                  <div className="relative aspect-square bg-zinc-900">
                    {preview ? (
                      <img
                        src={preview}
                        alt={item.caption?.slice(0, 80) || 'Post de Instagram'}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
                        Sin vista previa
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      {item.media_type === 'VIDEO' ? 'Video' : item.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Post'}
                    </span>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 text-xs font-bold text-zinc-300">
                      {item.caption || 'Ver publicación en Instagram'}
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{formatDate(item.timestamp)}</p>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
