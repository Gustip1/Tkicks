# Configuración de Vercel

## Image Optimization DESACTIVADO

Este proyecto tiene la optimización de imágenes de Vercel **completamente desactivada** por las siguientes razones:

1. **Todas las imágenes se procesan en Supabase** mediante Edge Functions
2. **No se usa sharp** en el proyecto - no es necesario instalarlo
3. **next/image usa modo unoptimized** - solo sirve las URLs de Supabase

## Configuración importante

- `images.unoptimized = true` - Deshabilita optimización de Vercel
- `runtime = 'nodejs'` en `/api/upload` - Compatible con Supabase calls
- No hay dependencias de `sharp` ni `@img/sharp-wasm32`

## ¿Por qué no usar Image Optimization de Vercel?

- Las imágenes ya están optimizadas por Supabase Edge Function
- Evita costos adicionales de transformaciones
- Evita límites de uso (5K transformaciones)
- Las imágenes se sirven directamente desde Supabase Storage

## Stack de imágenes

1. **Upload**: Cliente → `/api/upload` (Node.js runtime)
2. **Procesamiento**: Supabase Edge Function `compress-image`
3. **Almacenamiento**: Supabase Storage
4. **Entrega**: URLs directas de Supabase (sin optimización de Vercel)
