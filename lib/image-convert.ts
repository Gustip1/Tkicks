// Converts HEIC/HEIF files to WebP and compresses all images client-side.
// The server only ever receives the final optimized file.

const MAX_WIDTH_OR_HEIGHT = 1920;
const QUALITY = 0.82;

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

export async function prepareImage(file: File): Promise<File> {
  let working: File = file;

  // Step 1 — HEIC → WebP (browser-side, no server work)
  if (isHeic(file)) {
    const heic2any = (await import('heic2any')).default;
    const blob = await heic2any({
      blob: file,
      toType: 'image/webp',
      quality: QUALITY,
    }) as Blob;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    working = new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  }

  // Step 2 — compress (resize to max 1920px, keep quality)
  const imageCompression = (await import('browser-image-compression')).default;
  const compressed = await imageCompression(working, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
    fileType: working.type as 'image/webp' | 'image/jpeg' | 'image/png',
    initialQuality: QUALITY,
  });

  return new File([compressed], working.name, {
    type: compressed.type,
    lastModified: Date.now(),
  });
}
