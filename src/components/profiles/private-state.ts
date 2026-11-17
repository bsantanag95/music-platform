import type { ProfileView } from "@/services/profiles/profile-view";

export type PrivateState =
  | "anonymous"
  | "none"
  | "requested"
  | "incoming"
  | "blockedByMe"
  | "blockedByThem"
  | "preview";

// Qué está viendo exactamente quien no tiene acceso a un perfil privado: define el
// título, la oración y la acción de la franja, y cuánta identidad muestra la
// cabecera. `preview` es el dueño con "cómo te ven" (ve lo que ve un anónimo, con
// la acción inerte).
export function privateState(
  profile: Pick<ProfileView, "relation" | "blockedByMe">,
  authenticated: boolean,
  preview: boolean,
): PrivateState {
  if (preview) return "preview";
  if (!authenticated) return "anonymous";
  if (profile.relation === "blocked") return profile.blockedByMe ? "blockedByMe" : "blockedByThem";
  if (profile.relation === "incoming") return "incoming";
  if (profile.relation === "requested") return "requested";
  return "none";
}

export function isBlockedState(state: PrivateState): boolean {
  return state === "blockedByMe" || state === "blockedByThem";
}
