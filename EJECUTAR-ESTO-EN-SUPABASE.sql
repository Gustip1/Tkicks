-- EJECUTAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Para solucionar el error: "Could not find the 'is_new' column"

-- 1. Agregar columna is_new a la tabla products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT false;

-- 2. Actualizar productos existentes (opcional - marcar algunos como nuevos)
-- UPDATE public.products SET is_new = true WHERE created_at > NOW() - INTERVAL '30 days';

-- 3. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products(is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_active_is_new ON public.products(active, is_new) WHERE active = true;

-- 4. IMPORTANTE: Actualizar el cache de schema en Supabase
-- Después de ejecutar este script, ve a:
-- Settings → API → Click en "Refresh schema cache" o reinicia PostgREST

-- 5. Verificar que la columna existe
SELECT 
  table_name,
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products' 
  AND column_name = 'is_new';

-- Si ves 1 fila con información de la columna, ¡está lista! ✅
