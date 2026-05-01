import Link from 'next/link';
import { Instagram, MapPin, MessageCircle, ArrowUpRight, Shield, Truck, CreditCard } from 'lucide-react';

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.321 6.5a6.67 6.67 0 0 1-3.892-1.246A6.67 6.67 0 0 1 13.07 1.5h-3.24v13.09a3.15 3.15 0 1 1-2.26-3.02V8.32a6.38 6.38 0 1 0 5.5 6.32V8.83a9.8 9.8 0 0 0 6.25 2.12V7.72a6.5 6.5 0 0 1-.001-.004z" />
    </svg>
  );
}

const INSTAGRAM_URL = 'https://www.instagram.com/tkicks.sj';
const TIKTOK_URL = 'https://www.tiktok.com/@tkicks.sj';
const WHATSAPP_URL = 'https://api.whatsapp.com/send?phone=5492644802994';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-10 md:mt-16 border-t border-white/5 bg-gradient-to-b from-black via-zinc-950 to-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="max-w-[1600px] mx-auto px-5 md:px-10 pt-10 md:pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pb-10">
        {/* Top: CTA row */}
        <div className="grid gap-6 md:gap-8 md:grid-cols-[1.1fr_1fr] items-start">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Tkicks" className="h-10 w-auto rounded-md" />
              <div>
                <p className="font-black text-white text-lg uppercase tracking-tight leading-none">Tkicks</p>
                <p className="text-[11px] md:text-xs text-white/50 font-bold mt-1">Sneakers & Streetwear · San Juan</p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm md:text-[15px] text-white/55 font-medium leading-relaxed">
              El único reseller de San Juan enfocado 100% en producto original. Curamos cada drop para que tengas sólo
              lo que vale la pena.
            </p>
          </div>

          {/* Social cards */}
          <div className="grid grid-cols-2 gap-2.5 md:gap-3">
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-white/10 p-4 md:p-5 bg-gradient-to-br from-[#833ab4]/30 via-[#fd1d1d]/25 to-[#fcb045]/25 hover:border-white/30 transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center">
                  <Instagram className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="mt-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-white/70">Instagram</p>
              <p className="text-sm md:text-base font-black text-white leading-tight">@tkicks.sj</p>
            </a>

            <a
              href={TIKTOK_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative overflow-hidden rounded-2xl border border-white/10 p-4 md:p-5 bg-gradient-to-br from-black via-zinc-900 to-black hover:border-white/30 transition-all active:scale-[0.98]"
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-[#25F4EE]/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-[#FE2C55]/20 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <TikTokIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-white/60 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="relative mt-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-white/70">TikTok</p>
              <p className="relative text-sm md:text-base font-black text-white leading-tight">@tkicks.sj</p>
            </a>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-10 md:mt-14 grid grid-cols-3 gap-2.5 md:gap-4">
          {[
            { icon: Shield, title: '100% Originales', sub: 'Autenticidad garantizada' },
            { icon: Truck, title: 'Envíos nacionales', sub: 'Seguimiento incluido' },
            { icon: CreditCard, title: '3 cuotas s/interés', sub: 'Tarjetas bancarias' },
          ].map(({ icon: Icon, title, sub }) => (
            <div
              key={title}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 md:p-4"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] md:text-sm font-black text-white leading-tight truncate">{title}</p>
                <p className="hidden md:block text-[11px] text-white/45 font-bold mt-0.5 truncate">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Links grid */}
        <div className="mt-10 md:mt-14 grid gap-8 grid-cols-2 md:grid-cols-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-4">Tienda</p>
            <ul className="space-y-2.5 text-sm font-bold text-white/75">
              <li><Link href="/productos?sneakers" className="hover:text-white transition-colors">Sneakers</Link></li>
              <li><Link href="/productos?streetwear" className="hover:text-white transition-colors">Streetwear</Link></li>
              <li><Link href="/ofertas" className="hover:text-white transition-colors">Ofertas</Link></li>
              <li><Link href="/nuevos-ingresos" className="hover:text-white transition-colors">Nuevos ingresos</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-4">Servicios</p>
            <ul className="space-y-2.5 text-sm font-bold text-white/75">
              <li><Link href="/encargos" className="hover:text-white transition-colors">Encargos</Link></li>
              <li><Link href="/nosotros" className="hover:text-white transition-colors">Nosotros</Link></li>
              <li>
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white transition-colors">
                  WhatsApp <MessageCircle className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-4">Seguinos</p>
            <ul className="space-y-2.5 text-sm font-bold text-white/75">
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <Instagram className="w-3.5 h-3.5" /> @tkicks.sj
                </a>
              </li>
              <li>
                <a href={TIKTOK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:text-white transition-colors">
                  <TikTokIcon className="w-3.5 h-3.5" /> @tkicks.sj
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-4">Ubicación</p>
            <div className="flex items-start gap-2 text-sm font-bold text-white/75">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>San Juan · Argentina<br /><span className="text-white/45 font-medium text-xs">Showroom con cita previa</span></span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 md:mt-14 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] md:text-xs font-bold text-white/40">
          <p>© {year} Tkicks · Todos los derechos reservados.</p>
          <p>
            Todas las ventas son <span className="text-white/70 font-black">Final Sale</span>.
          </p>
        </div>
      </div>
    </footer>
  );
}
