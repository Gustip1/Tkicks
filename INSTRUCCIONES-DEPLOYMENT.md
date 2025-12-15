# 📋 Instrucciones para Deployment en Vercel

## 🔴 IMPORTANTE: Configurar Supabase Storage

Los cambios ya están en GitHub, pero necesitas configurar el bucket de imágenes en Supabase:

### 1. Crear el Bucket (si no existe)
1. Ve a tu proyecto en Supabase Dashboard
2. Ve a **Storage** en el menú lateral
3. Click en **"New bucket"**
4. Nombre: `product-images`
5. **IMPORTANTE:** Marca como **"Public bucket"** ✅
6. Click en **"Create bucket"**

### 2. Configurar Políticas de Seguridad
1. Ve a **SQL Editor** en Supabase
2. Abre el archivo `supabase/setup-storage.sql` de este proyecto
3. Copia y pega TODO el contenido en el SQL Editor
4. Click en **"Run"** para ejecutar

### 3. Verificar Variables de Entorno en Vercel
1. Ve a tu proyecto en Vercel Dashboard
2. Ve a **Settings** → **Environment Variables**
3. Verifica que existan estas variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (esta es crítica para subir imágenes)

### 4. Forzar Redeploy en Vercel
1. Ve a tu proyecto en Vercel Dashboard
2. Ve a la pestaña **"Deployments"**
3. Click en los 3 puntos del deployment más reciente
4. Selecciona **"Redeploy"**
5. Asegúrate de marcar **"Use existing Build Cache"** como **NO** ❌

## 🧪 Probar en Local

El servidor ya está corriendo en: **http://localhost:3000**

Para probar la subida de imágenes localmente:
1. Ve a http://localhost:3000/admin-login
2. Inicia sesión como admin
3. Ve a **Productos** → **Nuevo** o edita un producto existente
4. Arrastra imágenes o haz click en el área de carga

## ✅ Checklist de Funcionalidades Corregidas

- [x] Warnings de React Hooks eliminados
- [x] Variable de entorno corregida (`SUPABASE_SERVICE_ROLE_KEY`)
- [x] Sidebar oculto en versión móvil del admin
- [x] Manejo de errores mejorado en subida de imágenes
- [x] Campo `is_new` (Nuevos ingresos) funcionando correctamente

## 🆘 Si algo no funciona

### Problema: No se pueden subir imágenes
**Solución:**
1. Verifica que el bucket `product-images` existe y es público
2. Ejecuta el script SQL de políticas
3. Verifica la variable `SUPABASE_SERVICE_ROLE_KEY` en Vercel

### Problema: Sidebar aparece en móvil
**Solución:**
1. Limpia la cache del navegador (Ctrl + Shift + R)
2. Asegúrate de que se hizo el redeploy en Vercel

### Problema: No puedo editar "Nuevos ingresos"
**Solución:**
1. El campo `is_new` debe existir en la tabla `products` de Supabase
2. Verifica en Supabase Table Editor que la columna existe
3. Si no existe, ejecuta:
   ```sql
   ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;
   ```

## 🔗 Links Útiles

- Local: http://localhost:3000
- Admin Local: http://localhost:3000/admin
- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
