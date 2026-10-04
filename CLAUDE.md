# Tkicks — conocimiento de diseño

Resumen de las skills de diseño instaladas en `.claude/skills/` (apple-design,
emil-design-eng, impeccable, taste, mobile-native). Están con
`disable-model-invocation: true` para no gastar contexto: **para cambios de
diseño alcanza con esto**. Leer una skill completa solo si el dueño la pide por
nombre (`/apple-design`, etc.) o si hace falta un detalle que acá no está.

## Reglas del dueño (no negociables)
- Lenguaje visual de apple.com. Fuente: solo la de Apple (SF Pro / system-ui). Nada de fuentes nuevas.
- Tipografía uniforme y con peso; no mezclar pesos finos. Textos en español rioplatense (vos: "Seleccioná", "Mirá").
- Celular primero: 93% del tráfico. Carruseles compactos de a dos en celular.
- Hero de la home: solo la marca, sin fotos de productos; debajo categorías con fotos; opiniones al final.
- "Subí a GitHub" = commit a `main` + push = producción (Vercel). Compilar con `npm run build` antes.

## Piezas que ya existen (usarlas, no inventar otras)
- Tipografía: `t-hero t-display t-section t-lead t-tagline t-body t-strong t-caption t-fine`; titular en dos tonos con `<span className="t-muted">`.
- Franjas: `bleed` + `tile-light | tile-parchment | tile-dark | tile-black`, `tile-inner`. El cambio de color es el divisor (sin bordes ni sombras).
- Botones: `btn-apple`, `btn-apple-ghost`, `link-apple` (con ›), `paddle-apple` (círculo sobre fotos). Tarjeta: `store-card`.
- Aparición al scrollear: `data-reveal` (sube) y `data-reveal="clip"` (fotos, recorte). Solo en contenido, **nunca en encabezados**.
- Hero: `hero-line` (máscara) y `hero-rise hero-d1..d4`. Un solo momento animado por pantalla.
- Curvas: `var(--ease-out)` entradas/UI, `var(--ease-in-out)` movimiento en pantalla, `var(--ease-drawer)` paneles; `ease-apple` en Tailwind.
- Material: `material-nav` (vidrio oscuro de la barra). Gesto: `lib/useSwipeToDismiss.ts` (paneles que se cierran con el dedo). `lib/haptics.ts` (vibración en momentos clave).
- `TouchFeedback` hace funcionar `:active` en iPhone; no sacarlo.

## Movimiento (Emil + Apple)
- ¿Se ve cien veces por día? No animar. Acciones de teclado: nunca.
- Respuesta al apoyar el dedo, no al soltar: `:active` → `scale(0.97)` en ~100ms. Nunca `scale(0)`: mínimo 0.95 + opacidad.
- Duraciones: presión 100–160ms, menús 150–250ms, paneles 200–500ms. UI por debajo de 300ms.
- Entradas con ease-out propio; nunca `ease-in`. Solo `transform`, `opacity` (y `clip-path`/`filter` puntual). Nada de `transition-all`: listar propiedades.
- Sin rebote salvo que el usuario haya lanzado algo con el dedo. Popups se "materializan": `blur(8px)+scale(.96)` → nítido.
- Entra y sale por el mismo camino (el carrito entra y sale por la derecha). Los menús nacen desde su botón (`transform-origin`).
- Gestos: seguir al dedo 1:1, resistencia en los bordes (rubber band), decidir por la inercia proyectada, salida desde la posición actual.
- Transiciones CSS (interrumpibles) antes que `@keyframes` para UI que se puede disparar varias veces.
- Hover solo con mouse (Tailwind `hoverOnlyWhenSupported` ya lo hace; en CSS propio usar `@media (hover: hover) and (pointer: fine)`).
- Movimiento reducido = menos, no cero: fundidos cortos en vez de desplazamientos.
- **Nunca mandar contenido invisible desde el servidor** (`initial={{opacity:0}}` de framer-motion, `opacity-0` hasta que cargue JS). Con datos móviles dejaba la página en blanco ~7 s y parecía colgada. Entradas: CSS que corre sin JS (`page-enter`, `hero-rise`) o `data-reveal` (mejora progresiva).

## Materiales y accesibilidad
- Barras y hojas flotantes: fondo translúcido + `backdrop-filter: saturate(180%) blur(20px)`; el contenido pasa por debajo. No apilar vidrio claro sobre vidrio claro.
- `prefers-reduced-transparency` → superficies sólidas; `prefers-contrast: more` → bordes definidos (ya hay bloque en `globals.css`).
- Objetivos táctiles ≥ 44px. Contraste AA. Foco visible. `alt` en toda imagen con contenido.

## Piso de calidad (Impeccable / Taste)
- Nada de etiqueta chica arriba del título, emojis como íconos, degradés decorativos, texto violeta/azul "IA", signos de exclamación en confirmaciones.
- Copy directo y concreto; sin "¡Oops!" ni frases de relleno. No inventar datos, reseñas ni promociones.
- Estados completos: cargando (esqueleto con la forma real), vacío (con salida útil), error (en línea, en el campo).
- Las promos se leen de la base (`useInstallmentsPromo`, `settings`), nunca fechas fijas en el código.

## Verificación (una ronda, no un bucle)
`npm run build` → `npx next start -p 3006` → capturas con Playwright en 390×844 y 1440×900 de `/`, `/ofertas`, una ficha, `/checkout`, una 404.
En los tests: interceptar `**/rest/v1/**` que no sea GET (responder 201), `/api/analytics/**` (204) y `/api/orders**` (500) para no ensuciar analíticas ni crear pedidos reales.
