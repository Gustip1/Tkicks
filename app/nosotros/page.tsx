import type { Metadata } from 'next';
import Link from 'next/link';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';

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
      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-black to-emerald-950 p-5 md:p-8">
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <p className="inline-flex rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-300">
                Quiénes somos
              </p>
              <GiveawayInlinePriceClue clueId="/nosotros" label="Nosotros" position={4} digit="0" />
            </div>
            <h1 className="text-2xl font-black leading-tight md:text-4xl">
              Somos Tkicks: cultura urbana, autenticidad y comunidad.
            </h1>
            <p className="max-w-2xl text-sm font-bold leading-relaxed text-zinc-300 md:text-[15px]">
              Somos Tkicks, el único reseller de San Juan enfocado en streetwear y sneakers originales.
              Soy Gustavo y arranqué este proyecto para traer a la provincia eso que faltaba del hype.
              Hoy seguimos con la misma idea: buenos lanzamientos, producto auténtico y una comunidad que comparte esta cultura.
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

          <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-zinc-800 bg-black/30 p-2 sm:gap-3">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Foco</p>
              <p className="mt-2 text-sm font-bold text-white">Streetwear y sneakers originales, sin vueltas</p>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Estilo</p>
              <p className="mt-2 text-sm font-bold text-white">Hype real y lanzamientos clave</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-zinc-700 bg-zinc-900/70 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">Comunidad</p>
              <p className="mt-2 text-sm font-bold text-white">
                En @tkicks.sj compartimos producto real, outfits, videos y novedades para que estés siempre al día.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-zinc-800 bg-zinc-950 p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black md:text-2xl">Feed de Instagram</h2>
            <p className="text-xs font-bold text-zinc-400 md:text-sm">Últimos posteos y videos de @tkicks.sj.</p>
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
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3 xl:grid-cols-4">
            {feed.map((item) => {
              const preview = item.media_type === 'VIDEO' ? item.thumbnail_url || item.media_url : item.media_url;
              return (
                <a
                  key={item.id}
                  href={item.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-xl border border-zinc-800 bg-black transition hover:border-zinc-600"
                >
                  <div className="relative aspect-[4/5] bg-zinc-900">
                    {preview ? (
                      <img
                        src={preview}
                        alt={item.caption?.slice(0, 80) || 'Post de Instagram'}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-zinc-500">
                        Sin vista previa
                      </div>
                    )}
                    <span className="absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      {item.media_type === 'VIDEO' ? 'Video' : item.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Post'}
                    </span>
                  </div>
                  <div className="space-y-1.5 p-2.5">
                    <p className="line-clamp-1 text-[11px] font-bold text-zinc-300">
                      {item.caption || 'Ver publicación en Instagram'}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{formatDate(item.timestamp)}</p>
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
