// Versión vigente de los Términos del servicio y cómo se aceptan (openspec: add-terms-acceptance, ADR 0061).
//
// `TERMS_VERSION` es la fecha (ISO) de la última modificación de `/terms`: se guarda con cada aceptación
// (`app_user.terms_version`) para saber qué texto aceptó cada persona. Quien cambie el texto de los
// Términos actualiza esta constante (y con ella la fecha que se ve al pie de la página: `INFO_PAGES.terms`
// la lee de acá) en el mismo cambio. Está aparte de `info-pages.ts` para que el servicio de cuentas no
// arrastre la carga de mensajes.

export const TERMS_VERSION = "2026-11-14";

/**
 * `checkbox`: casilla marcada en el registro con email. `notice`: aviso junto al botón de Google, sin
 * casilla. La base lo restringe igual (`chk_app_user_terms_acceptance`).
 */
export type TermsAcceptanceMethod = "checkbox" | "notice";

/** Columnas de `app_user` para un alta que acepta los Términos (ADR 0061): fecha, versión vigente y modo. */
export function termsAcceptanceValues(via: TermsAcceptanceMethod) {
  return { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION, termsAcceptedVia: via };
}
