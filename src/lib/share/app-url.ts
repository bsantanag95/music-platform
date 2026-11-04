// Origen público de la app para las URL absolutas de compartir (metadatos, imágenes, enlaces de la hoja).
// Mismo criterio que el resto del código: `NEXT_PUBLIC_APP_URL`, con el origen local de desarrollo si falta.

const DEV_ORIGIN = "http://localhost:3000";

export function appOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? DEV_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return DEV_ORIGIN;
  }
}

/** Dominio que se muestra en la firma de las imágenes ("ejemplo.app"). */
export function appDomain(): string {
  return new URL(appOrigin()).host.replace(/^www\./, "");
}

/** URL absoluta de una ruta de la app (`/es/album/…`). */
export function absoluteUrl(path: string): string {
  return new URL(path, appOrigin()).toString();
}
