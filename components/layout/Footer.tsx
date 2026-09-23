import Link from 'next/link';

const INSTAGRAM_URL = 'https://www.instagram.com/tkicks.sj';
const TIKTOK_URL = 'https://www.tiktok.com/@tkicks.sj';
const WHATSAPP_URL = 'https://api.whatsapp.com/send?phone=5492644802994';

export function Footer() {
  const year = new Date().getFullYear();

  const columns: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: 'Tienda',
      links: [
        { label: 'Nuevos ingresos', href: '/nuevos-ingresos' },
        { label: 'Sneakers', href: '/productos?sneakers' },
        { label: 'Streetwear', href: '/productos?streetwear' },
        { label: 'Ofertas', href: '/ofertas' },
        { label: 'Subastas', href: '/subastas' },
      ],
    },
    {
      title: 'Servicios',
      links: [
        { label: 'Encargos', href: '/encargos' },
        { label: 'Cómo comprar', href: '/#como-comprar' },
        { label: 'Seguí tu pedido', href: '/track' },
        { label: 'WhatsApp', href: WHATSAPP_URL, external: true },
      ],
    },
    {
      title: 'Tkicks',
      links: [
        { label: 'Nosotros', href: '/nosotros' },
        { label: 'Instagram', href: INSTAGRAM_URL, external: true },
        { label: 'TikTok', href: TIKTOK_URL, external: true },
      ],
    },
  ];

  // Footer de apple.com: franja parchment, letra de 12px, notas legales arriba,
  // columnas de links en el medio y el copyright abajo. Sin tarjetas ni íconos.
  return (
    <footer className="bg-parchment text-gray-600 t-fine">
      <div className="max-w-[1024px] mx-auto px-[22px] pt-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="space-y-2.5 pb-4 border-b border-gray-300/70 text-gray-500 leading-[1.4]">
          <p>
            Todos los productos son 100% originales y se venden con su comprobante de compra. Las ventas son
            finales (Final Sale).
          </p>
          <p>
            Los precios se publican en dólares y se convierten a pesos al tipo de cambio oficial del día. El pago en
            3 cuotas con tarjeta puede tener recargo según la promoción vigente.
          </p>
        </div>

        <nav aria-label="Pie de página" className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-7 py-7">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="t-tagline text-gray-900 mb-2.5">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer" className="hover:underline hover:text-gray-900">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="hover:underline hover:text-gray-900">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="t-tagline text-gray-900 mb-2.5">Showroom</h3>
            <p className="leading-[1.6]">
              San Juan, Argentina
              <br />
              Visitas con cita previa
            </p>
          </div>
        </nav>

        <div className="pt-4 border-t border-gray-300/70 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-gray-500">
          <p>Copyright © {year} Tkicks. Todos los derechos reservados.</p>
          <p>Argentina</p>
        </div>
      </div>
    </footer>
  );
}
