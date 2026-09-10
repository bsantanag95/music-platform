import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ApiError } from "@/lib/api/errors";
import { resolveSession } from "./sessions";
import { requirePermissionForUser, type Permission } from "./authorization";

// Requiere sesión para un Server Component de página: si no hay sesión,
// redirige a login con el locale en curso (no lanza JSON de API).
export async function requirePageUser() {
  const session = await resolveSession();
  if (session) return session.user;
  const locale = await getLocale();
  redirect(`/${locale}/auth/login`);
}

export async function requirePagePermission(permission: Permission) {
  const user = await requirePageUser();
  try {
    await requirePermissionForUser(user.id, permission);
  } catch (error) {
    // Solo la falta de permiso redirige al inicio: un error de infraestructura
    // (ej. fallo de BD al resolver roles) debe propagarse, no enmascararse.
    if (error instanceof ApiError && error.code === "ROLE_REQUIRED") {
      const locale = await getLocale();
      redirect(`/${locale}`);
    }
    throw error;
  }
  return user;
}
