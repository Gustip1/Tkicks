// Converts HEIC/HEIF files to WebP and compresses all images client-side.
// The server only ever receives the final optimized file.

const MAX_WIDTH_OR_HEIGHT = 1920;
const QUALITY = 0.82;
const MAX_SIZE_MB = 1.5;

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

function needsCompression(file: File): boolean {
  return file.size > MAX_SIZE_MB * 1024 * 1024;
}

export async function prepareImage(file: File): Promise<File> {
  // HEIC path: convert once with heic2any (already applies quality).
  // Skip browser-image-compression to avoid double-processing.
  if (isHeic(file)) {
    const { default: heic2any } = await import('heic2any');
    const blob = await heic2any({
      blob: file,
      toType: 'image/webp',
      quality: QUALITY,
    }) as Blob;
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  }

  // Non-HEIC: only compress if the file is actually large
  if (!needsCompression(file)) return file;

  const { default: imageCompression } = await import('browser-image-compression');
  const compressed = await imageCompression(file, {
    maxSizeMB: MAX_SIZE_MB,
    maxWidthOrHeight: MAX_WIDTH_OR_HEIGHT,
    useWebWorker: true,
    initialQuality: QUALITY,
  });

  return new File([compressed], file.name, {
    type: compressed.type,
    lastModified: Date.now(),
  });
}
