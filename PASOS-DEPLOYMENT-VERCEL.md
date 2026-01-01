# 🚀 PASOS PARA SOLUCIONAR LOS PROBLEMAS EN VERCEL

## 📍 Estado Actual
✅ Servidor local corriendo en: **http://localhost:3000**
✅ Cambios subidos a GitHub
⚠️ Necesitas configurar Supabase y hacer redeploy en Vercel

---

## 🔧 PASO 1: Configurar Supabase Storage (CRÍTICO)

### A. Crear el Bucket de Imágenes
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto **Tkicks**
3. En el menú lateral, click en **Storage**
4. Click en **"New bucket"**
5. Completa:
   - **Name:** `product-images`
   - **Public bucket:** ✅ **SÍ, debe estar marcado**
6. Click en **"Create bucket"**

### B. Configurar Políticas de Seguridad
1. En Supabase, ve a **SQL Editor** (menú lateral)
2. Click en **"New query"**
3. Abre el archivo `supabase/setup-storage.sql` de tu proyecto
4. Copia **TODO** el contenido
5. Pégalo en el SQL Editor de Supabase
6. Click en **"Run"** (botón verde abajo a la derecha)
7. Deberías ver: "Success. No rows returned"

---

## 🆕 PASO 2: Agregar Columna "Nuevos Ingresos"

1. En Supabase, todavía en **SQL Editor**
2. Click en **"New query"**
3. Abre el archivo `supabase/migration-add-is-new.sql`
4. Copia **TODO** el contenido
5. Pégalo en el SQL Editor
6. Click en **"Run"**
7. Deberías ver información de la columna `is_new`

---

## 🔑 PASO 3: Verificar Variables de Entorno en Vercel

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto **Tkicks**
3. Ve a **Settings** → **Environment Variables**
4. **VERIFICA** que existan estas 3 variables:

| Variable | Valor (ejemplo) | Dónde obtenerlo |
|----------|----------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | eyJhbGc... | Supabase → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbGc... | Supabase → Settings → API → service_role (⚠️ **secreta**) |

### Si falta `SUPABASE_SERVICE_ROLE_KEY`:
1. Ve a Supabase Dashboard
2. Click en **Settings** → **API**
3. Copia el **service_role key** (⚠️ NO LA COMPARTAS)
4. En Vercel, click **"Add New"**
5. Nombre: `SUPABASE_SERVICE_ROLE_KEY`
6. Value: pega la key
7. Environments: marca **Production, Preview, Development**
8. Click **"Save"**

---

## 🔄 PASO 4: Redeploy en Vercel (IMPORTANTE)

1. En Vercel, ve a la pestaña **"Deployments"**
2. Busca el deployment más reciente (arriba de todo)
3. Click en los **3 puntos** (⋮) a la derecha
4. Click en **"Redeploy"**
5. **⚠️ IMPORTANTE:** Desmarca **"Use existing Build Cache"**
6. Click en **"Redeploy"**
7. Espera 2-3 minutos a que termine el build

---

## ✅ PASO 5: Verificar que Todo Funciona

### En Local (http://localhost:3000):
1. Ve a http://localhost:3000/admin-login
2. Inicia sesión con tu usuario admin
3. Ve a **Productos** → **Nuevo producto**
4. Prueba arrastrar una imagen → debería subirse ✅
5. Marca el checkbox **"Nuevos ingresos"** → debería guardarse ✅
6. Abre Chrome DevTools (F12) → en móvil no debería verse el sidebar ✅

### En Vercel (tu dominio):
1. Ve a tu URL de Vercel (ej: tkicks.vercel.app)
2. Ve a /admin-login
3. Prueba lo mismo que en local

---

## 🆘 Troubleshooting

### ❌ Error: "No se pueden subir imágenes"
**Causa:** El bucket no existe o no es público, o falta la service_role key

**Solución:**
1. Verifica que el bucket `product-images` existe y es **público** ✅
2. Ejecuta el script `setup-storage.sql` de nuevo
3. Verifica que `SUPABASE_SERVICE_ROLE_KEY` esté en Vercel
4. Haz redeploy en Vercel

### ❌ Error: "No puedo marcar 'Nuevos ingresos'"
**Causa:** La columna `is_new` no existe en la base de datos

**Solución:**
1. Ejecuta el script `migration-add-is-new.sql` en Supabase
2. Verifica que se ejecutó correctamente

### ❌ El sidebar sigue apareciendo en móvil
**Causa:** Cache del navegador o Vercel no hizo rebuild

**Solución:**
1. Limpia cache del navegador (Ctrl + Shift + R o Cmd + Shift + R)
2. Asegúrate de que hiciste redeploy **SIN** usar build cache
3. Espera 2-3 minutos más

---

## 📱 Contacto de Ayuda

Si algo no funciona después de seguir estos pasos:
1. Revisa los logs de Vercel (Deployments → click en el deployment → Functions)
2. Revisa la consola del navegador (F12 → Console)
3. Anota el error exacto que ves

---

## 🎯 Checklist Final

- [ ] Bucket `product-images` creado y **público**
- [ ] Script `setup-storage.sql` ejecutado
- [ ] Script `migration-add-is-new.sql` ejecutado
- [ ] Variable `SUPABASE_SERVICE_ROLE_KEY` agregada en Vercel
- [ ] Redeploy hecho en Vercel **sin cache**
- [ ] Probado subir imágenes en local ✅
- [ ] Probado "Nuevos ingresos" en local ✅
- [ ] Sidebar oculto en móvil local ✅
- [ ] Todo funciona en Vercel ✅

---

**Una vez completado todo, tu sitio debería funcionar perfectamente! 🎉**
