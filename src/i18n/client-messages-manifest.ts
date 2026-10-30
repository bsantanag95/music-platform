import type { Analysis } from "./client-messages-analysis";

/** Archivo generado con las rutas de mensajes de cada proveedor (relativo a la raíz del repo). */
export const MANIFEST_PATH = "src/i18n/client-messages.json";

/** Contenido exacto de `client-messages.json` para un análisis (orden estable, salto final). */
export function serializeManifest(analysis: Analysis): string {
  const manifest = Object.fromEntries(analysis.scopes.map(({ scope, paths }) => [scope, paths]));
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
