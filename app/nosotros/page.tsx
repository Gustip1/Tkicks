import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Instagram,
  MapPin,
  Shield,
  Sparkles,
  Truck,
  Users,
  ArrowRight,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { GiveawayInlinePriceClue } from '@/components/giveaway/GiveawayClue';
import { getInstagramPosts } from '@/lib/instagram';

export const metadata: Metadata = {
  title: 'Nosotros | Tkicks',
  description:
    'Conocé Tkicks: el reseller de sneakers y streetwear originales en San Juan. Nuestra historia, nuestros valores y el feed en vivo de nuestras redes.',
};

const INSTAGRAM_URL = 'https://www.instagram.com/tkicks.sj';
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
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-32 h-[420px] w-[420px] rounded-full bg-gray-300/30 blur-[120px] animate-pulse-slow" />
          <div className="absolute top-40 -right-24 h-[380px] w-[380px] rounded-full bg-gray-200/30 blur-[120px] animate-pulse-slow animation-delay-2000" />
          <div className="absolute bottom-0 left-1/2 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-gray-300/20 blur-[140px]" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10 pt-16 md:pt-28 pb-16 md:pb-24">
          <div className="animate-hero-enter inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 border border-gray-200 mb-6 md:mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gray-900 opacity-40" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-900" />
            </span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.18em] text-gray-700">
              Nosotros · Tkicks
            </span>
            <GiveawayInlinePriceClue clueId="/nosotros" label="Nosotros" position={4} digit="0" />
          </div>

          <h1 className="animate-hero-enter hero-delay-1 text-[2.5rem] leading-[0.95] md:text-7xl lg:text-8xl font-black tracking-tighter max-w-5xl text-gray-900">
            Cultura urbana,
            <br />
            <span className="text-gray-900 underline decoration-red-600 decoration-4 underline-offset-4">hecha en San&nbsp;Juan.</span>
          </h1>

          <p className="animate-hero-enter hero-delay-2 mt-6 md:mt-8 max-w-2xl text-base md:text-xl leading-relaxed text-gray-600 font-medium">
            Somos <span className="font-bold text-gray-900">Tkicks</span>, el único reseller de la provincia enfocado 100%
            en sneakers y streetwear <span className="font-bold text-gray-900">originales</span>. Traemos el hype real a
            San Juan, con curaduría, honestidad y una comunidad que vive esta cultura todos los días.
          </p>

          <div className="animate-hero-enter hero-delay-3 mt-8 md:mt-10 flex flex-col sm:flex-row gap-3">
            <Link
              href="/productos"
              className="group inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-black transition-all active:scale-[0.98]"
            >
              Ver catálogo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white text-gray-900 font-black text-sm uppercase tracking-tight border border-gray-300 hover:bg-gray-50 hover:border-gray-500 transition-all active:scale-[0.98]"
            >
              <Instagram className="w-4 h-4" />
              @tkicks.sj
            </a>
          </div>

          <div className="animate-hero-enter hero-delay-4 mt-10 md:mt-14 flex flex-wrap gap-x-6 gap-y-3 text-[11px] md:text-xs font-bold uppercase tracking-wider text-gray-500">
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
              <p className="mt-2 text-[11px] md:text-xs font-black uppercase tracking-widest text-gray-900">{s.v}</p>
              <p className="mt-1 text-[11px] md:text-xs font-bold text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────── STORY ───────────────────────── */}
      <section className="relative">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24 grid gap-10 md:gap-16 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-900">
              <span className="h-px w-8 bg-gray-900" /> Nuestra historia
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-[1.05] text-gray-900">
              Empezó con una idea simple:<br className="hidden md:block" />
              <span className="text-gray-400">que el hype</span> <span className="text-gray-900">también viva acá.</span>
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
            <div className="relative rounded-3xl border border-gray-200 bg-gray-50 p-6 md:p-10 overflow-hidden shadow-sm">
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gray-200 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gray-100 blur-3xl" />
              <div className="relative grid grid-cols-2 gap-3">
                {[
                  { icon: Shield, title: 'Autenticidad', desc: 'Cada par, 100% original.' },
                  { icon: Sparkles, title: 'Curaduría', desc: 'Sólo lo que vale la pena.' },
                  { icon: MapPin, title: 'Local', desc: 'Showroom en San Juan.' },
                  { icon: Users, title: 'Comunidad', desc: 'Tkicks Fam, real.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5 hover:border-gray-400 hover:shadow-sm transition-all">
                    <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm md:text-base font-black text-gray-900">{title}</p>
                    <p className="text-[11px] md:text-xs text-gray-500 font-bold mt-1">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────── WHAT WE OFFER ───────────────────────── */}
      <section className="relative bg-gray-50 border-y border-gray-200">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-900">
              <span className="h-px w-8 bg-gray-900" /> Lo que nos define
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-[1.05] text-gray-900">
              No somos otro reseller. <span className="text-gray-400">Somos el tuyo.</span>
            </h2>
          </div>

          <div className="mt-10 md:mt-14 grid gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: 'Autenticidad garantizada', desc: 'Cada par y cada prenda pasa por control antes de salir. Si tenés dudas, te mostramos todo antes.' },
              { icon: Truck, title: 'Envíos a todo el país', desc: 'Coordinamos entrega con seguimiento. Si estás en San Juan, te invitamos al showroom.' },
              { icon: Sparkles, title: 'Drops curados', desc: 'Traemos sólo lo que vale la pena. Sin rellenar catálogo con cualquier cosa.' },
              { icon: Users, title: 'Comunidad real', desc: 'Somos una crew, no un carrito. Outfits, rifas y contenido con la gente que ya compra acá.' },
              { icon: CheckCircle2, title: 'Asesoramiento 1 a 1', desc: 'Te ayudamos con talles, combinaciones y ocasión. Sin presión de venta.' },
              { icon: Play, title: 'Detrás de escena', desc: 'Cada lanzamiento con video, unboxing y stories. Todo se ve en nuestras redes.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="group animate-fade-up rounded-2xl border border-gray-200 bg-white p-5 md:p-6 hover:border-gray-400 hover:shadow-sm hover:-translate-y-0.5 transition-all"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center mb-4 group-hover:bg-gray-900 group-hover:border-gray-900 transition-colors">
                  <Icon className="w-5 h-5 md:w-6 md:h-6 text-gray-900 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-base md:text-lg font-black text-gray-900 tracking-tight">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 font-medium leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── SOCIAL CONNECT ───────────────────────── */}
      <section className="relative">
        <div className="max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-900">
              <span className="h-px w-8 bg-gray-900" /> Seguinos en las redes
            </span>
            <h2 className="mt-4 text-3xl md:text-5xl font-black tracking-tight leading-[1.05] text-gray-900">
              Todo pasa en <span className="text-gray-900 underline decoration-red-600 decoration-4 underline-offset-4">@tkicks.sj</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-gray-500 font-medium">
              Drops, rifas, unboxings y outfits. Si no estás en las redes, te estás perdiendo la mitad de la tienda.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:gap-5 md:grid-cols-2">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-3xl border-2 border-gray-900 p-6 md:p-8 bg-white hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="relative flex flex-col gap-5 md:gap-7 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-900 flex items-center justify-center">
                    <Instagram className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-500">Instagram</p>
                </div>
                <div>
                  <p className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight leading-none">@tkicks.sj</p>
                  <p className="mt-2 text-sm md:text-base text-gray-600 font-medium">
                    Feed de producto, lanzamientos, stories con stock del día.
                  </p>
                </div>
                <div className="mt-auto inline-flex items-center gap-2 text-sm font-black uppercase tracking-tight text-gray-900">
                  Seguir en Instagram
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </a>

            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-3xl border border-gray-200 p-6 md:p-8 bg-gray-900 hover:border-gray-600 hover:shadow-md transition-all active:scale-[0.99]"
            >
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="relative flex flex-col gap-5 md:gap-7 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <TikTokIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </div>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-white/70">TikTok</p>
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white">Nuevo</span>
                </div>
                <div>
                  <p className="text-2xl md:text-4xl font-black text-white tracking-tight leading-none">@tkicks.sj</p>
                  <p className="mt-2 text-sm md:text-base text-white/70 font-medium">Videos cortos, unboxings y behind the scenes del showroom.</p>
                </div>
                <div className="mt-auto inline-flex items-center gap-2 text-sm font-black uppercase tracking-tight text-white">
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
              <span className="inline-flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-gray-900">
                <span className="h-px w-8 bg-gray-900" /> En vivo
              </span>
              <h2 className="mt-3 text-2xl md:text-4xl font-black tracking-tight text-gray-900">Último contenido del feed</h2>
              <p className="mt-2 text-xs md:text-sm font-bold text-gray-500">Los posteos más recientes de @tkicks.sj.</p>
            </div>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-900 bg-white text-xs font-black uppercase tracking-widest text-gray-900 hover:bg-gray-900 hover:text-white transition-all active:scale-[0.98]"
            >
              Ver perfil completo
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {feed.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 md:p-14 text-center">
              <Instagram className="w-10 h-10 md:w-12 md:h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm md:text-base font-bold text-gray-600">El feed se conecta automáticamente con Instagram.</p>
              <p className="text-xs md:text-sm text-gray-400 mt-2 max-w-md mx-auto">Mientras tanto, podés ver todo el contenido directamente en el perfil.</p>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-black uppercase tracking-tight hover:bg-black transition-all active:scale-[0.98]"
              >
                <Instagram className="w-4 h-4" />
                Abrir @tkicks.sj
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
                    className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white hover:border-gray-400 hover:shadow-md transition-all"
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
                        <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-gray-400">Sin vista previa</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <span className="absolute left-2 top-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 border border-gray-200">
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
                        <p className="line-clamp-2 text-[11px] md:text-xs font-bold text-white leading-snug">
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
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-72 w-[700px] rounded-full bg-gray-100 blur-[120px]" />
        </div>
        <div className="relative max-w-[1200px] mx-auto px-5 md:px-10 py-16 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gray-200 bg-gray-100 text-[10px] md:text-xs font-black uppercase tracking-widest text-gray-600">
            <MapPin className="w-3.5 h-3.5 text-gray-900" /> Showroom · San Juan
          </span>
          <h2 className="mt-5 text-3xl md:text-6xl font-black tracking-tighter leading-[0.95] max-w-3xl mx-auto text-gray-900">
            Vení, probate un par
            <br />
            <span className="text-gray-900 underline decoration-red-600 decoration-4 underline-offset-4">y llevate lo que buscabas.</span>
          </h2>
          <p className="mt-5 max-w-xl mx-auto text-sm md:text-base text-gray-500 font-medium">
            Te esperamos en el showroom o coordinamos por WhatsApp. Siempre hay alguien del otro lado para ayudarte.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/productos"
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-gray-900 text-white font-black text-sm uppercase tracking-tight hover:bg-black transition-all active:scale-[0.98]"
            >
              Ver catálogo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border-2 border-gray-900 bg-white text-gray-900 font-black text-sm uppercase tracking-tight hover:bg-gray-900 hover:text-white transition-all active:scale-[0.98]"
            >
              Escribinos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
