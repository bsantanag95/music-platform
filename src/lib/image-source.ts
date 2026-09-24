/**
 * Decide si una imagen ya viene preprocesada a su tamaño final y puede
 * servirse sin el optimizador de Next (openspec: mirror-cover-art).
 *
 * Verdadero solo para el dominio público del storage propio (carátulas
 * espejadas, avatares) y para las rutas `/uploads/` del driver `local`.
 * Falso para cualquier otra fuente, incluidas Cover Art Archive, archive.org,
 * dominios desconocidos y una fuente futura que nadie haya previsto.
 *
 * La comparación es por hostname exacto (no por prefijo de cadena): así
 * `https://storage.example.evil.com` no se confunde con el storage real.
 */
export function isPreprocessedImageSrc(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("/uploads/")) return true;

  const domain = process.env.STORAGE_PUBLIC_DOMAIN;
  if (!domain) return false;

  const base = domain.includes("://") ? domain : `https://${domain}`;

  try {
    const candidate = new URL(src);
    const expected = new URL(base);
    return (
      candidate.protocol === expected.protocol &&
      candidate.hostname === expected.hostname
    );
  } catch {
    return false;
  }
}
