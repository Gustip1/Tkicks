# 🔴 SOLUCIÓN RÁPIDA: Error "Could not find the 'is_new' column"

## ⚡ PASOS SIMPLES (5 minutos)

### 1️⃣ Abre Supabase
Ve a: https://supabase.com/dashboard

### 2️⃣ Selecciona tu proyecto "Tkicks"
Click en el proyecto desde el listado

### 3️⃣ Abre el SQL Editor
En el menú lateral izquierdo, busca y click en **"SQL Editor"**

### 4️⃣ Crea una nueva query
Click en el botón **"New query"** (arriba a la izquierda)

### 5️⃣ Copia y pega este código:

```sql
-- Agregar columna is_new
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_products_is_new 
ON public.products(is_new) WHERE is_new = true;

CREATE INDEX IF NOT EXISTS idx_products_active_is_new 
ON public.products(active, is_new) WHERE active = true;
```

### 6️⃣ Ejecuta el script
Click en el botón verde **"Run"** (abajo a la derecha)

### 7️⃣ Verifica el resultado
Deberías ver: **"Success. No rows returned"** ✅

### 8️⃣ Actualiza el cache (IMPORTANTE)
Opción A: Ve a **Settings** → **API** → Click en **"Reload schema"**
Opción B: Espera 1-2 minutos (se actualiza automáticamente)

### 9️⃣ Reinicia tu servidor local
En la terminal donde corre `npm run dev`:
- Presiona `Ctrl + C` para detener
- Ejecuta `npm run dev` nuevamente

---

## ✅ Verificar que funcionó

Ve a: http://localhost:3000/admin/productos/nuevo

Si puedes ver y marcar el checkbox **"Nuevos ingresos"**, ¡está solucionado! 🎉

---

## 🆘 Si sigue sin funcionar

1. En Supabase, ve a **Database** → **Tables** → **products**
2. Busca la columna `is_new` en la lista de columnas
3. Si NO está ahí, ejecuta el script de nuevo
4. Si SÍ está ahí pero sigue el error:
   - Ve a **Settings** → **API** 
   - Click en **"Reload schema"**
   - Espera 2 minutos
   - Reinicia tu servidor local

---

## 📌 Archivo alternativo

También puedes abrir y ejecutar: **`EJECUTAR-ESTO-EN-SUPABASE.sql`**
(Tiene el mismo código con más comentarios)
