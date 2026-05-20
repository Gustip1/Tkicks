export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body style={{ margin: 0, background: '#fff' }}>{children}</body>
    </html>
  );
}
