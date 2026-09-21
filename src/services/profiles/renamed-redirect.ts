import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { resolveUsernameAlias } from "@/services/auth/username";

/**
 * Si `username` es el usuario anterior de alguien y su reserva sigue vigente
 * (30 días), redirige de forma temporal a la misma ruta bajo el usuario nuevo
 * (spec account-username, "Redirección del enlace anterior"). Si no lo es,
 * vuelve sin hacer nada y la página sigue con su "no encontrado".
 *
 * `subpath` es lo que sigue a `/users/{usuario}` (p. ej. `/favorites`). No se
 * usa en la API pública, que responde como usuario inexistente.
 */
export async function redirectIfRenamed(username: string, subpath = ""): Promise<void> {
  const current = await resolveUsernameAlias(username);
  if (!current) return;
  const locale = await getLocale();
  redirect(`/${locale}/users/${encodeURIComponent(current)}${subpath}`);
}
