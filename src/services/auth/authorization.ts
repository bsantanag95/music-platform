import { resolveSession } from "./sessions";
import { ApiError } from "@/lib/api/errors";

export async function requireUser() {
  const current = await resolveSession();
  if (!current) throw new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa");
  return current.user;
}

export async function getCurrentUser() {
  return (await resolveSession())?.user ?? null;
}
