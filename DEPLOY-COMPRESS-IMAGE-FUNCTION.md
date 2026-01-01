# Deployment de la Función de Compresión de Imágenes en Supabase

Esta función permite comprimir imágenes en Supabase en lugar de Vercel, evitando los límites de tamaño de Edge Functions.

## Prerrequisitos

1. Tener instalado Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Hacer login en Supabase:
```bash
supabase login
```

## Pasos para el Deployment

### 1. Linkear tu proyecto con Supabase

```bash
supabase link --project-ref TU_PROJECT_REF
```

Podés encontrar el `project-ref` en la URL de tu dashboard de Supabase:
`https://supabase.com/dashboard/project/TU_PROJECT_REF`

### 2. Deployar la función

Desde la raíz del proyecto, ejecutá:

```bash
supabase functions deploy compress-image
```

### 3. Verificar el deployment

Podés verificar que la función esté activa en:
- Dashboard de Supabase → Edge Functions
- O mediante: `supabase functions list`

## Configuración

La función usa las siguientes variables de entorno (ya disponibles en Supabase):
- `SUPABASE_URL`: URL de tu proyecto
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (con permisos completos)

Estas variables están automáticamente disponibles en las Edge Functions de Supabase.

## Cómo Funciona

1. El cliente (ImageUploader) envía las imágenes al endpoint `/api/upload`
2. El endpoint de Next.js valida que el usuario sea admin
3. Se reenvía el FormData a la función de Supabase Edge
4. La función de Supabase:
   - Recibe las imágenes
   - Las comprime usando Sharp (sin límites de Vercel)
   - Las sube al bucket `product-images`
   - Devuelve las URLs públicas
5. El endpoint de Next.js devuelve las URLs al cliente

## Beneficios

✅ **Sin límites de tamaño**: Supabase Edge Functions no tienen el límite de 4.5MB de Vercel  
✅ **Mejor rendimiento**: La compresión se hace más cerca del storage  
✅ **Costos optimizados**: Menos transferencia de datos entre servicios  
✅ **Más confiable**: Menos puntos de falla en la cadena de procesamiento

## Troubleshooting

### Error: "Function not found"
- Verificá que hayas ejecutado `supabase functions deploy compress-image`
- Chequeá en el dashboard que la función esté listada

### Error: "Authorization required"
- Verificá que el usuario esté logueado
- Chequeá que el rol sea 'admin' en la tabla profiles

### Error: "Bucket not found"
- Asegurate de tener el bucket `product-images` creado y público
- Ejecutá el script `setup-storage.sql` si es necesario

## Comandos Útiles

```bash
# Ver logs de la función
supabase functions logs compress-image

# Deployar con logs en vivo
supabase functions deploy compress-image --debug

# Eliminar la función (si necesitás)
supabase functions delete compress-image
```
