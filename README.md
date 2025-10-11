# 🛍️ Tkicks - E-commerce de Sneakers & Streetwear

E-commerce completo desarrollado con Next.js 14, Supabase, TypeScript y Tailwind CSS. Sistema tipo Shopify con panel de administración profesional.

## ✨ Características Principales

### 🛒 **Frontend Cliente**
- **Landing Page** con carruseles destacados y USP cards
- **Catálogo** con filtros por categoría (Sneakers/Streetwear) y talles
- **Búsqueda avanzada** por nombre de producto o talle (con debounce)
- **PDP (Product Detail Page)** con carrusel de imágenes y selector de talles
- **Carrito** con drawer lateral y persistencia en localStorage
- **Checkout** de 3 pasos (Entrega → Datos → Revisión)
- **Tracking público** por número de pedido + email

### 👥 **Sistema de Usuarios**
- **Registro y Login** de clientes
- **Portal de usuario** (`/account`) con perfil y acciones rápidas
- **Historial de pedidos** (`/orders`) con estados y seguimiento
- **Autenticación** con Supabase Auth

### 🔧 **Panel de Administración (Tipo Shopify)**
- **Dashboard** con KPIs, alertas y pedidos recientes
- **Gestión de Pedidos** con estados, tracking y detalles completos
- **CRUD de Productos** con variantes, stock y destacados
- **Bulk Pricing** por porcentaje o monto fijo
- **Gestión de Stock** por talles
- **Upload de Imágenes** con conversión automática
- **Clientes** con estadísticas de compras
- **Configuración** de tienda y transportistas

### 🗄️ **Base de Datos & Backend**
- **Supabase** como BaaS (PostgreSQL + Auth + Storage + RLS)
- **Esquema completo** con productos, variantes, pedidos, perfiles
- **RLS (Row Level Security)** para seguridad
- **Triggers** para order numbers automáticos
- **RPC** para tracking público y bulk pricing
- **Índices optimizados** para búsquedas rápidas

## 🚀 Instalación y Configuración

### 1. **Clonar y Instalar Dependencias**
```bash
git clone <repo-url>
cd tkicks
npm install
```

### 2. **Configurar Variables de Entorno**
Crear `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key
```

### 3. **Configurar Supabase**

#### **Ejecutar Migraciones SQL**
1. Ir a Supabase Dashboard → SQL Editor
2. Ejecutar el contenido de `supabase/schema.sql`
3. Esto creará todas las tablas, tipos, triggers, índices y RPC

#### **Configurar Storage**
1. Crear bucket `product-images` (público)
2. Configurar políticas de storage:
```sql
-- Lectura pública
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Escritura solo para admins
CREATE POLICY "Admin write access" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
```

### 4. **Crear Usuario Administrador**
```bash
npm run tsx scripts/create-admin.ts
```
Esto creará un admin con:
- **Email:** `admin@tkicks.com`
- **Password:** `admin123`

### 5. **Ejecutar en Desarrollo**
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`

## 📱 Rutas Principales

### **Cliente**
- `/` - Landing page
- `/productos` - Catálogo completo
- `/productos?sneakers` - Solo sneakers
- `/productos?streetwear` - Solo streetwear
- `/producto/[slug]` - Detalle de producto
- `/checkout` - Proceso de compra
- `/track` - Seguimiento público
- `/register` - Registro de usuario
- `/login` - Login de usuario
- `/account` - Portal de usuario
- `/orders` - Historial de pedidos

### **Administración**
- `/admin-login` - Login de administrador
- `/admin` - Dashboard principal
- `/admin/pedidos` - Gestión de pedidos
- `/admin/productos` - CRUD de productos
- `/admin/stock` - Gestión de stock
- `/admin/precios` - Bulk pricing
- `/admin/destacados` - Productos destacados
- `/admin/uploads` - Subida de imágenes
- `/admin/clientes` - Lista de clientes
- `/admin/ajustes` - Configuración

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run start        # Servidor de producción
npm run lint         # Linter
npm run test         # Tests unitarios
npm run e2e          # Tests E2E con Playwright
npm run seed         # Poblar base de datos (opcional)
```

## 📊 Características Técnicas

### **Stack Tecnológico**
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui components
- **Estado:** Zustand (carrito, UI, checkout)
- **Base de Datos:** Supabase (PostgreSQL)
- **Autenticación:** Supabase Auth
- **Storage:** Supabase Storage
- **Imágenes:** Next.js Image + Sharp
- **Testing:** Vitest + React Testing Library + Playwright

### **Optimizaciones**
- **Búsqueda:** Índices GIN con pg_trgm para ILIKE rápido
- **Imágenes:** Lazy loading y optimización automática
- **Estado:** Persistencia en localStorage
- **Performance:** Debounce en búsquedas (350ms)
- **SEO:** Metadata, sitemap, robots.txt

### **Seguridad**
- **RLS:** Row Level Security en todas las tablas
- **Políticas:** Admin/usuario/público bien definidas
- **Validación:** Zod schemas y validación de tipos
- **CORS:** Configurado correctamente

## 🎯 Funcionalidades Clave

### **Motor de Búsqueda Optimizado**
- Búsqueda por **título, slug o talle** con trigrama
- **Debounce** para evitar consultas excesivas
- **Filtros** por categoría y talle
- **Paginación** con "Cargar más"
- **Sincronización** con URL params (`?q=`)

### **Gestión de Pedidos**
- **Estados:** draft → paid → fulfilled/cancelled
- **Order Numbers:** formato `TK-YYYYMM-00001` auto-generado
- **Tracking:** carrier, número y URL editables
- **Fulfillment:** retiro en tienda o envío a domicilio

### **Sistema de Productos**
- **Variantes** por talle con stock independiente
- **Imágenes** múltiples con drag & drop
- **Destacados** por categoría
- **Bulk pricing** con preview y confirmación

## 🧪 Testing

### **Tests Unitarios**
```bash
npm run test
```
- Tests de componentes (ProductCard, carrito)
- Tests de stores (Zustand)
- Tests de utilidades

### **Tests E2E**
```bash
npm run e2e
```
- Flujo completo: home → categoría → búsqueda → PDP → carrito → checkout
- Admin: crear producto → gestionar pedido → tracking

## 🚢 Deploy

### **Vercel (Recomendado)**
1. Conectar repo a Vercel
2. Configurar variables de entorno
3. Deploy automático

### **Variables de Entorno para Producción**
```env
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE=your-production-service-role-key
```

## 📋 TODOs / Próximas Funcionalidades

- [ ] **Pasarela de pago** (Stripe/MercadoPago)
- [ ] **Cálculo de envío** automático por CP
- [ ] **Notificaciones email** (order confirmations, tracking updates)
- [ ] **Wishlist** de productos
- [ ] **Reviews y ratings**
- [ ] **Cupones de descuento**
- [ ] **Inventario automático** (reducir stock al confirmar pedido)
- [ ] **Analytics dashboard** con gráficos
- [ ] **Multi-idioma** (i18n)
- [ ] **PWA** para experiencia mobile

## 🤝 Contribuir

1. Fork del proyecto
2. Crear feature branch (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Add nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

---

**¿Necesitas ayuda?** Revisa la documentación de [Next.js](https://nextjs.org/docs) y [Supabase](https://supabase.com/docs).