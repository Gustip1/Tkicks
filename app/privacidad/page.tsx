import { LegalList, LegalPage, LEGAL_WHATSAPP } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Política de privacidad | Tkicks',
  description: 'Qué datos personales junta Tkicks, para qué los usa, con quién los comparte y cómo pedir que se corrijan o se borren.',
  alternates: { canonical: '/privacidad' },
};

const wa = (
  <a href={LEGAL_WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
    WhatsApp
  </a>
);

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Política de privacidad"
      other={{ href: '/terminos', label: 'Términos y condiciones' }}
      intro={
        <p>
          Acá te contamos qué datos tuyos guardamos cuando usás tkicks.com.ar, para qué los usamos y cómo pedirnos
          que los corrijamos o los borremos. El responsable de esos datos es Tkicks, con showroom en San Juan,
          Argentina.
        </p>
      }
      sections={[
        {
          id: 'datos',
          title: 'Qué datos juntamos',
          body: (
            <LegalList>
              <li>
                <strong className="font-semibold text-gray-900">Cuando comprás:</strong> nombre y apellido, DNI, email,
                teléfono y, si pedís envío o pagás con tarjeta, la dirección de envío y de facturación.
              </li>
              <li>
                <strong className="font-semibold text-gray-900">Cuando pagás con tarjeta:</strong> los datos de la
                tarjeta los recibe y procesa Payway. Tkicks no guarda el número completo ni el código de seguridad:
                solo la marca, los últimos 4 números y el resultado del cobro.
              </li>
              <li>
                <strong className="font-semibold text-gray-900">Cuando nos dejás una consulta, una oferta o un encargo:</strong>{' '}
                tu teléfono y lo que nos escribas, y tu nombre si lo ponés.
              </li>
              <li>
                <strong className="font-semibold text-gray-900">Si creás una cuenta:</strong> tu email, para que veas
                tus pedidos.
              </li>
              <li>
                <strong className="font-semibold text-gray-900">Cuando navegás:</strong> qué páginas ves, desde qué tipo
                de dispositivo, desde dónde llegaste y la ciudad aproximada. Se asocia a un identificador anónimo
                guardado en tu navegador, no a tu nombre.
              </li>
              <li>
                <strong className="font-semibold text-gray-900">En tu dispositivo:</strong> el carrito, tus favoritos y
                el número que nos dejaste quedan guardados en tu navegador, para que no tengas que cargarlos de nuevo.
              </li>
            </LegalList>
          ),
        },
        {
          id: 'uso',
          title: 'Para qué los usamos',
          body: (
            <LegalList>
              <li>Preparar, cobrar, facturar y entregar tu pedido.</li>
              <li>Escribirte por WhatsApp o email sobre tu compra, tu consulta o tu encargo.</li>
              <li>Prevenir fraudes en los pagos con tarjeta.</li>
              <li>Entender cómo se usa la web para mejorarla, y medir cómo funcionan nuestros anuncios.</li>
            </LegalList>
          ),
        },
        {
          id: 'terceros',
          title: 'Con quién los compartimos',
          body: (
            <>
              <p>No vendemos tus datos. Solo los compartimos con quienes hacen falta para que la tienda funcione:</p>
              <LegalList>
                <li>Payway, que procesa los pagos con tarjeta y su control antifraude.</li>
                <li>El correo que entrega tu pedido, que recibe tu nombre, dirección y teléfono.</li>
                <li>ARCA, cuando emitimos la factura de tu compra.</li>
                <li>Los servicios donde está alojada la web y su base de datos (Vercel y Supabase).</li>
                <li>
                  Meta (Instagram y Facebook): la web usa su píxel, que registra tu visita para medir nuestros anuncios.
                </li>
              </LegalList>
            </>
          ),
        },
        {
          id: 'tiempo',
          title: 'Cuánto tiempo los guardamos',
          body: (
            <p>
              Mientras hagan falta para tu pedido, para responderte y para cumplir con las obligaciones fiscales de
              cada venta. Las consultas que no terminan en una compra se pueden borrar cuando lo pidas.
            </p>
          ),
        },
        {
          id: 'derechos',
          title: 'Tus derechos',
          body: (
            <>
              <p>
                Podés pedirnos en cualquier momento ver qué datos tuyos tenemos, corregirlos o borrarlos. Escribinos
                por {wa} y lo hacemos.
              </p>
              <p>
                El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en
                forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al
                efecto, conforme lo establecido en el artículo 14, inciso 3 de la Ley N.º 25.326.
              </p>
              <p>
                La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N.º 25.326,
                tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en
                sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
              </p>
            </>
          ),
        },
        {
          id: 'cambios',
          title: 'Cambios en esta política',
          body: <p>Si cambiamos algo de esta política lo publicamos en esta página, con la fecha desde la que vale.</p>,
        },
      ]}
    />
  );
}
