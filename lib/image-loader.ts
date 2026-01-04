/**
 * Custom image loader para Next.js
 * Devuelve las URLs directamente desde Supabase sin optimización
 */
export default function supabaseLoader({ src }: { src: string }) {
  // Devolver la URL tal cual viene de Supabase
  return src;
}
