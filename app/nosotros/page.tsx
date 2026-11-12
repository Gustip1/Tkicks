import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Instagram,
  ArrowRight,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';
import { getInstagramPosts } from '@/lib/instagram';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/accountNotice';

export const metadata: Metadata = {
  title: 'Nosotros | Tkicks',
  description:
    'Conocé Tkicks: el reseller de sneakers y streetwear originales en San Juan. Nuestra historia, nuestros valores y el feed en vivo de nuestras redes.',
};

// El feed de Instagram se renueva cada hora (y al guardar el token en el admin)
export const revalidate = 3600;

const TIKTOK_URL = 'https://www.tiktok.com/@tkicks.sj';
const WHATSAPP_URL = 'https://api.whatsapp.com/send?phone=5492644802994';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M19.321 6.5a6.67 6.67 0 0 1-3.892-1.246A6.67 6.67 0 0 1 13.07 1.5h-3.24v13.09a3.15 3.15 0 1 1-2.26-3.02V8.32a6.38 6.38 0 1 0 5.5 6.32V8.83a9.8 9.8 0 0 0 6.25 2.12V7.72a6.5 6.5 0 0 1-.001-.004z" />
    </svg>
  );
}

export default async function NosotrosPage() {
  const feed = await getInstagramPosts(9);

  return (
    <div className="bg-white text-gray-900 -mx-2 md:-mx-8 lg:-mx-12 -my-3 md:-my-8 overflow-hidden">

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10 pt-16 md:pt-28 pb-16 md:pb-24">
          <GiveawayInlinePriceClue clueId="/nosotros" label="Nosotros" position={4} digit="0" />

          <h1 className="t-display animate-hero-enter hero-delay-1 max-w-5xl text-gray-900">
            Cultura urbana,
            <br />
            hecha en San&nbsp;Juan
          </h1>

          <p className="animate-hero-enter hero-delay-2 mt-6 md:mt-8 max-w-2xl text-base md:text-xl leading-relaxed text-gray-600 font-medium">
            Somos <span className="font-bold text-gray-900">Tkicks</span>, el único reseller de la provincia enfocado 100%
            en sneakers y streetwear <span className="font-bold text-gray-900">originales</span>. Traemos el hype real a
            San Juan, con curaduría, honestidad y una comunidad que vive esta cultura todos los días.
          </p>

          <div className="animate-hero-enter hero-delay-3 mt-8 md:mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/productos"
              className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-pricing text-white font-normal text-sm hover:bg-pricing-hover transition active:scale-[0.98]"
            >
              Ver catálogo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-gray-900 font-black text-sm border border-gray-300 hover:bg-gray-50 hover:border-gray-500 transition active:scale-[0.98]"
            >
              <Instagram className="w-4 h-4" />
              {INSTAGRAM_HANDLE}
            </a>
          </div>

          <div className="animate-hero-enter hero-delay-4 mt-10 md:mt-14 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-gray-500">
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-900" /> 100% originales</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-900" /> Showroom físico</span>
            <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-900" /> Envíos a todo el país</span>
          </div>
        </div>
      </section>

      {/* ───────────────────────── STATS STRIP ───────────────────────── */}
      <section className="relative border-y border-gray-200 bg-gray-50">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-8 md:py-12 grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-6">
          {[
            { k: '2025', v: 'Desde', sub: 'Trayectoria & hype' },
            { k: '100%', v: 'Originales', sub: 'Sin excepciones' },
            { k: '1', v: 'Showroom', sub: 'Físico en San Juan' },
            { k: '24/7', v: 'Online', sub: 'Siempre con stock' },
          ].map((s, i) => (
            <div key={s.v} className="animate-fade-up text-center md:text-left" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="text-3xl md:text-5xl font-black text-gray-900 leading-none tracking-tighter">{s.k}</p>
              <p className="mt-2 text-xs font-black text-gray-900">{s.v}</p>
              <p className="mt-1 text-xs font-bold text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── STORY ───────────────────────── */}
      <section className="relative">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24 grid gap-10 md:gap-16 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <h2 className="t-section text-gray-900">
              Empezó con una idea simple:<br className="hidden md:block" />
              que el hype también viva acá
            </h2>
            <div className="mt-6 space-y-4 text-[15px] md:text-base leading-relaxed text-gray-600 font-medium">
              <p>
                Arranqué Tkicks porque en San Juan no había un lugar serio para conseguir producto auténtico sin
                depender de viajes o encargos eternos. Quería un espacio donde comprar un par no fuera una lotería
                — que cada pieza que saliera de acá tenga historia, procedencia y respaldo.
              </p>
              <p className="text-gray-700">
                Hoy seguimos con la misma idea: <span className="text-gray-900 font-bold">drops curados, producto
                auténtico</span> y una comunidad que comparte esta cultura.
              </p>
              <p className="text-gray-400">— Gustavo, fundador</p>
            </div>
          </div>

          <div className="relative">
            <dl className="divide-y divide-[#d6d6d6] border-y border-[#d6d6d6]">
              {[
                { title: 'Autenticidad', desc: 'Cada par, 100% original.' },
                { title: 'Curaduría', desc: 'Sólo lo que vale la pena.' },
                { title: 'Local', desc: 'Showroom en San Juan.' },
                { title: 'Comunidad', desc: 'Tkicks Fam, real.' },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="t-strong text-gray-900">{title}</dt>
                  <dd className="t-caption text-gray-600 text-right">{desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ───────────────────────── WHAT WE OFFER ───────────────────────── */}
      <section className="relative bg-gray-50 border-y border-gray-200">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2 className="t-section text-gray-900">
              No somos otro reseller. Somos el tuyo
            </h2>
          </div>

          <div className="mt-10 md:mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Autenticidad garantizada', desc: 'Cada par y cada prenda pasa por control antes de salir. Si tenés dudas, te mostramos todo antes.' },
              { title: 'Envíos a todo el país', desc: 'Coordinamos entrega con seguimiento. Si estás en San Juan, te invitamos al showroom.' },
              { title: 'Drops curados', desc: 'Traemos sólo lo que vale la pena. Sin rellenar catálogo con cualquier cosa.' },
              { title: 'Comunidad real', desc: 'Somos una crew, no un carrito. Outfits, rifas y contenido con la gente que ya compra acá.' },
              { title: 'Asesoramiento 1 a 1', desc: 'Te ayudamos con talles, combinaciones y ocasión. Sin presión de venta.' },
              { title: 'Detrás de escena', desc: 'Cada lanzamiento con video, unboxing y stories. Todo se ve en nuestras redes.' },
            ].map(({ title, desc }) => (
              <div key={title} className="border-t border-[#d6d6d6] pt-5">
                <h3 className="t-tagline text-gray-900">{title}</h3>
                <p className="mt-2 t-caption text-gray-600 max-w-[42ch]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── SOCIAL CONNECT ───────────────────────── */}
      <section className="relative">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="t-section text-gray-900">
              Ahora somos <span className="text-gray-900">{INSTAGRAM_HANDLE}</span>
            </h2>
            <p className="mt-4 t-body text-gray-600">
              Es nuestra cuenta oficial de ahora en adelante: ahí publicamos los drops, el stock del día y
              los unboxings.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:gap-5 md:grid-cols-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-2xl bg-gray-100 p-6 md:p-8 transition-colors hover:bg-gray-200/70"
            >
              <div className="relative flex flex-col gap-5 md:gap-7 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-900 flex items-center justify-center">
                    <Instagram className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <p className="text-xs font-black text-gray-500">Instagram</p>
                </div>
                <div>
                  <p className="t-display text-gray-900">{INSTAGRAM_HANDLE}</p>
                  <p className="mt-2 t-body text-gray-600">
                    Nuestra cuenta oficial: feed de producto, lanzamientos y stories con el stock del día.
                  </p>
                </div>
                <div className="mt-auto inline-flex items-center gap-2 text-sm font-black text-gray-900">
                  Seguir en Instagram
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>

            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-3xl border border-gray-200 p-6 md:p-8 bg-gray-900 hover:border-gray-600 hover:shadow-md transition active:scale-[0.99]"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative flex flex-col gap-5 md:gap-7 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <TikTokIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <p className="text-xs font-black text-white/70">TikTok</p>
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-xs font-black text-white">Nuevo</span>
                </div>
                <div>
                  <p className="t-display text-white">@tkicks.sj</p>
                  <p className="mt-2 text-sm md:text-base text-white/70 font-medium">Videos cortos, unboxings y behind the scenes del showroom.</p>
                </div>
                <div className="mt-auto inline-flex items-center gap-2 text-sm font-black text-white">
                  Seguir en TikTok
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────── INSTAGRAM FEED ───────────────────────── */}
      <section className="relative border-t border-gray-200 bg-gray-50">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-3 mb-8 md:mb-10">
            <div>
              <h2 className="t-section text-gray-900">Último contenido del feed</h2>
              <p className="mt-2 t-caption text-gray-500">Los posteos más recientes de {INSTAGRAM_HANDLE}.</p>
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-primary bg-white text-xs font-normal text-primary hover:bg-pricing hover:text-white transition active:scale-[0.98]"
            >
              Ver perfil completo
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {feed.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 md:p-14 text-center">
              <Instagram className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
              <p className="t-body font-semibold text-gray-700">Estamos reconectando el feed con la cuenta nueva.</p>
              <p className="t-caption text-gray-500 mt-2 max-w-md mx-auto">Mientras tanto, mirá todo el contenido directamente en el perfil.</p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-pricing text-white text-sm font-normal hover:bg-pricing-hover transition active:scale-[0.98]"
              >
                <Instagram className="w-4 h-4" />
                Abrir {INSTAGRAM_HANDLE}
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
              {feed.map((item) => {
                const preview = item.imageUrl;
                return (
                  <a
                    key={item.id}
                    href={item.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-gray-400 hover:shadow-md transition"
                  >
                    <div className="relative aspect-[4/5] bg-gray-100">
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt={item.caption?.slice(0, 80) || 'Post de Instagram'}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">Sin vista previa</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute left-2 top-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-xs font-black text-gray-700 border border-gray-200">
                        {item.mediaType === 'VIDEO' ? 'Video' : item.mediaType === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Post'}
                      </span>
                      {item.mediaType === 'VIDEO' && (
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                            <Play className="w-5 h-5 text-gray-900 fill-gray-900 translate-x-0.5" />
                          </span>
                        </span>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="line-clamp-2 text-xs font-bold text-white leading-snug">
                          {item.caption || 'Ver publicación'}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────── FINAL CTA ───────────────────────── */}
      <section className="relative overflow-hidden border-t border-gray-200">
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24 text-center">
          <h2 className="t-section max-w-3xl mx-auto text-gray-900">
            Vení, probate un par
            <br />
            y llevate lo que buscabas
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-sm md:text-base text-gray-500 font-medium">
            Te esperamos en el showroom o coordinamos por WhatsApp. Siempre hay alguien del otro lado para ayudarte.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/productos"
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full bg-pricing text-white font-normal text-sm hover:bg-pricing-hover transition active:scale-[0.98]"
            >
              Ver catálogo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full border border-primary bg-white text-primary font-normal text-sm hover:bg-pricing hover:text-white transition active:scale-[0.98]"
            >
              Escribinos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
