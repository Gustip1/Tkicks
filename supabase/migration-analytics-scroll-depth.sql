-- ================================================
-- FIX: columna scroll_depth faltante en analytics_visits
-- La ruta /api/analytics/exit la actualiza en cada salida,
-- pero el esquema original solo la creó en analytics_pageviews.
-- Sin esta columna el update falla y se pierden duración,
-- scroll y rebote de cada visita.
-- Ejecutar en Supabase SQL Editor.
-- ================================================

alter table public.analytics_visits
  add column if not exists scroll_depth int default 0;
