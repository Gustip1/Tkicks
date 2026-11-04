import { createClient } from '@supabase/supabase-js';

export interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

interface RawInstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
}

/** El token vive en settings y solo se lee con la clave de servicio, nunca desde el navegador. */
async function readToken(): Promise<string | undefined> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .eq('key', 'instagram_access_token')
    .maybeSingle();

  return (data?.value as { token?: string } | null)?.token;
}

/** Le pregunta a Instagram si el token guardado sirve. Lo usa /admin/ajustes al guardar. */
export async function checkInstagramToken(): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const token = await readToken();
  if (!token) return { ok: false, error: 'No hay ningún token guardado.' };

  // Los de Facebook (por ejemplo, del Graph API Explorer) esta API no los acepta
  if (token.startsWith('EAA')) {
    return {
      ok: false,
      error:
        'Es un token de Facebook (empieza con EAA) y acá hace falta uno de Instagram, que empieza con IG. ' +
        'Generalo en developers.facebook.com, en "Instagram API with Instagram Login".',
    };
  }

  try {
    const res = await fetch(
      `https://graph.instagram.com/me?fields=username&access_token=${encodeURIComponent(token)}`,
      { cache: 'no-store' }
    );
    const json = await res.json();
    if (!res.ok || !json?.username) {
      return { ok: false, error: `Instagram lo rechazó: ${json?.error?.message ?? `error ${res.status}`}` };
    }
    return { ok: true, username: json.username };
  } catch {
    return { ok: false, error: 'No se pudo consultar a Instagram. Probá de nuevo en un rato.' };
  }
}

/**
 * Trae los últimos posts de @tkicks.gp. El token se carga desde /admin/ajustes
 * (tabla settings, key "instagram_access_token") — no depende de env vars, así
 * el dueño lo puede renovar sin redeploy. Usado tanto por /api/instagram/posts
 * (home, fetch client-side) como por la página /nosotros (server component).
 */
export async function getInstagramPosts(limit = 8): Promise<InstagramPost[]> {
  const token = await readToken();
  if (!token) return [];

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink';
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.error('[INSTAGRAM] Error de la API:', res.status, await res.text().catch(() => ''));
      return [];
    }

    const json = await res.json();
    const items: RawInstagramMedia[] = Array.isArray(json?.data) ? json.data : [];

    return items
      .filter((it) => it.media_type !== 'VIDEO' || it.thumbnail_url)
      .map((it) => ({
        id: it.id,
        imageUrl: it.media_type === 'VIDEO' ? it.thumbnail_url! : it.media_url,
        permalink: it.permalink,
        caption: it.caption?.slice(0, 140) ?? '',
        mediaType: it.media_type,
      }));
  } catch (error) {
    console.error('[INSTAGRAM] Error inesperado:', error);
    return [];
  }
}
