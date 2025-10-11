"use client";
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export interface UploadedImage { url: string; alt: string }

export function ImageUploader({ value, onChange }: { value: UploadedImage[]; onChange: (v: UploadedImage[]) => void }) {
  const [loading, setLoading] = useState(false);
  const onDrop = useCallback(async (accepted: File[]) => {
    setLoading(true);
    try {
      const form = new FormData();
      accepted.forEach((f) => form.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data: { url: string }[] = await res.json();
      onChange([...(value || []), ...data.map((d) => ({ url: d.url, alt: '' }))]);
    } finally {
      setLoading(false);
    }
  }, [value, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className="flex cursor-pointer items-center justify-center rounded border border-dashed bg-neutral-50 p-6 text-center text-sm hover:bg-neutral-100"
        aria-label="Zona de carga de imágenes"
      >
        <input {...getInputProps()} />
        {loading ? 'Subiendo...' : isDragActive ? 'Soltá las imágenes aquí...' : 'Arrastrá y soltá imágenes (JPEG/PNG/WEBP) o hacé click'}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {value?.map((img) => (
          <div key={img.url} className="relative rounded border p-2 text-xs">
            <div className="truncate">{img.url.split('/').pop()}</div>
            <input
              placeholder="Texto alternativo"
              className="mt-1 w-full rounded border px-2 py-1"
              value={img.alt}
              onChange={(e) => onChange(value.map((v) => (v.url === img.url ? { ...v, alt: e.target.value } : v)))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}


