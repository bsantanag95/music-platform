import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { resolveSession } from "./sessions";

// Requiere sesión para un Server Component de página: si no hay sesión,
// redirige a login con el locale en curso (no lanza JSON de API).
export async function requirePageUser() {
  const session = await resolveSession();
  if (session) return session.user;
  const locale = await getLocale();
  redirect(`/${locale}/auth/login`);
}