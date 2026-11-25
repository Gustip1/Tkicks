/**
 * Deja un comprobante listo para subir desde el navegador.
 *
 * Las fotos del celular pesan 3 a 8 MB y el servidor acepta hasta unos 4: las
 * grandes fallaban sin que el cliente supiera por qué. Acá se achican a 2000px
 * y se pasan a JPEG, que además cubre los formatos que el servidor no acepta
 * (por ejemplo HEIC del iPhone, si el navegador lo puede abrir). Los PDF y las
 * imágenes livianas van como están. Si algo falla se manda el original.
 */

const MAX_SIDE = 2000;
const LIGHT_BYTES = 1.5 * 1024 * 1024;
const DIRECT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PROOF_ACCEPT = 'image/*,application/pdf';

export async function prepareProof(file: File): Promise<File> {
  if (file.type === 'application/pdf') return file;
  if (DIRECT_TYPES.includes(file.type) && file.size <= LIGHT_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Fondo blanco: un PNG con transparencia quedaría negro al pasar a JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

/** Sube el comprobante de un pedido. Devuelve el motivo si no se pudo. */
export async function uploadProof(orderId: string, file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const fd = new FormData();
    fd.append('file', await prepareProof(file));
    fd.append('order_id', orderId);
    const res = await fetch('/api/upload-proof', { method: 'POST', body: fd });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) return { ok: true, url: data.url };
    if (res.status === 413) return { ok: false, error: 'El archivo es muy pesado. Probá con una captura de pantalla.' };
    return { ok: false, error: data?.error || 'No se pudo subir el archivo.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Probá de nuevo.' };
  }
}

export const isPdf = (url: string | null | undefined) => /\.pdf($|\?)/i.test(url || '');
