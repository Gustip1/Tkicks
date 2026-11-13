import Link from 'next/link';
import { LegalCallout, LegalList, LegalPage, LEGAL_WHATSAPP } from '@/components/legal/LegalPage';
import { INSTAGRAM_URL } from '@/lib/accountNotice';

export const metadata = {
  title: 'Términos y condiciones | Tkicks',
  description:
    'Condiciones de compra en Tkicks: productos exclusivos sin cambio, encargos sin reembolso, precios, pagos, envíos y subastas.',
  alternates: { canonical: '/terminos' },
};

const wa = (
  <a href={LEGAL_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
    WhatsApp
  </a>
);

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos y condiciones"
      other={{ href: '/privacidad', label: 'Política de privacidad' }}
      intro={
        <p>
          Estas condiciones valen para todas las compras, encargos, ofertas y subastas que se hacen en tkicks.com.ar.
          Al comprar o hacer un encargo las estás aceptando, así que leelas antes de pagar.
        </p>
      }
      sections={[
        {
          id: 'productos',
          title: 'Productos',
          body: (
            <>
              <p>Todos los productos que vendemos son 100% originales y se entregan con su comprobante de compra.</p>
              <p>
                Trabajamos con piezas exclusivas y de stock limitado. En la mayoría de los casos hay una sola unidad
                por talle: cuando se vende, no sabemos si vuelve a entrar.
              </p>
            </>
          ),
        },
        {
          id: 'cambios',
          title: 'Cambios y devoluciones',
          body: (
            <>
              <LegalCallout>
                Las ventas son finales. Los productos exclusivos no tienen cambio ni devolución por talle, modelo,
                color o gusto.
              </LegalCallout>
              <p>Por eso, antes de comprar:</p>
              <LegalList>
                <li>Revisá el talle y las medidas en la guía de talles de la ficha del producto.</li>
                <li>Mirá bien las fotos y la descripción.</li>
                <li>Si tenés cualquier duda, consultanos por {wa} antes de pagar.</li>
              </LegalList>
              <p>
                Si recibís un producto distinto al que compraste o con una falla de fábrica, escribinos por {wa} apenas
                lo recibas, con fotos, y lo resolvemos.
              </p>
            </>
          ),
        },
        {
          id: 'encargos',
          title: 'Encargos',
          body: (
            <>
              <p>
                Un <Link href="/encargos" className="text-primary hover:underline">encargo</Link> es un producto que
                conseguimos especialmente para vos, a pedido. No forma parte de nuestro stock: se compra a tu nombre.
              </p>
              <LegalCallout>
                Los encargos no se pueden cancelar ni reembolsar una vez confirmados, y no tienen cambio ni devolución.
              </LegalCallout>
              <LegalList>
                <li>Para confirmar un encargo se paga una seña del 75% del precio del producto.</li>
                <li>Desde que pagás la seña el encargo queda confirmado y la seña no se devuelve.</li>
                <li>El resto se paga como lo coordinemos por WhatsApp al confirmar el encargo.</li>
                <li>Los plazos de entrega son estimados y te los informamos por WhatsApp.</li>
                <li>Si no podemos conseguir el producto que encargaste, te devolvemos la seña completa.</li>
              </LegalList>
            </>
          ),
        },
        {
          id: 'precios',
          title: 'Precios y pagos',
          body: (
            <>
              <LegalList>
                <li>
                  Los precios se publican en dólares y se convierten a pesos al tipo de cambio oficial del día en que
                  pagás.
                </li>
                <li>Podés pagar por transferencia, con criptomonedas, en efectivo al retirar o con tarjeta de crédito.</li>
                <li>
                  Con tarjeta, 1 pago no tiene recargo. En cuotas hay recargo: 10% en 3 cuotas y 20% en 6, salvo que haya
                  una promoción vigente. El total exacto se muestra antes de pagar.
                </li>
                <li>Los pagos con tarjeta los procesa Payway. Tkicks no guarda los datos de tu tarjeta.</li>
                <li>Los pedidos por transferencia se confirman cuando recibimos el comprobante de pago.</li>
                <li>
                  Lo que agregás al carrito se reserva por 10 minutos. Pasado ese tiempo vuelve al stock y lo puede
                  comprar otra persona.
                </li>
              </LegalList>
            </>
          ),
        },
        {
          id: 'envios',
          title: 'Envíos y retiro',
          body: (
            <LegalList>
              <li>Podés retirar tu compra en nuestro showroom de San Juan, con cita previa.</li>
              <li>
                También hacemos envíos a domicilio dentro de Argentina. El costo del envío se muestra en el checkout
                antes de pagar.
              </li>
              <li>
                Cuando despachamos tu pedido te avisamos por WhatsApp o email, y podés seguirlo en{' '}
                <Link href="/track" className="text-primary hover:underline">Seguí tu pedido</Link>.
              </li>
              <li>Revisá que la dirección y el teléfono estén bien: los usa el correo para entregarte el paquete.</li>
            </LegalList>
          ),
        },
        {
          id: 'subastas',
          title: 'Subastas',
          body: (
            <>
              <p>
                Ofertar en una <Link href="/subastas" className="text-primary hover:underline">subasta</Link> es un
                compromiso de compra. Quien gana y no paga en el tiempo establecido, o intenta cancelar su oferta, queda
                excluido de las subastas de forma permanente.
              </p>
              <p>Las bases completas están en la sección de subastas.</p>
            </>
          ),
        },
        {
          id: 'ofertas',
          title: 'Ofertas de precio',
          body: (
            <p>
              Cuando un producto permite hacer una oferta, proponer un precio no lo reserva ni nos obliga a aceptarlo.
              La oferta vale recién cuando te la confirmamos por WhatsApp.
            </p>
          ),
        },
        {
          id: 'derechos',
          title: 'Tus derechos',
          body: (
            <p>
              Estas condiciones no limitan los derechos que te reconoce la Ley 24.240 de Defensa del Consumidor.
            </p>
          ),
        },
        {
          id: 'contacto',
          title: 'Contacto y cambios en estos términos',
          body: (
            <>
              <p>
                Tkicks tiene su showroom en San Juan, Argentina. Nos encontrás por {wa} y en{' '}
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Instagram
                </a>
                .
              </p>
              <p>
                Podemos actualizar estos términos. A cada compra se le aplican los que estaban publicados el día en que
                se hizo.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
