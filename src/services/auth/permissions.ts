export type Permission =
  | "moderation.review_content"
  | "moderation.suspend_social"
  | "editorial.author"
  | "editorial.publish"
  | "platform.manage_roles";

// Los permisos editoriales son dos bundles, no uno por acción: ningún rol
// necesita crear sin editar/proponer, ni publicar sin retirar. Ver ADR 0013.
const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  moderator: ["moderation.review_content", "moderation.suspend_social"],
  editorial_curator: ["editorial.author"],
  admin: [
    "moderation.review_content",
    "moderation.suspend_social",
    "editorial.author",
    "editorial.publish",
    "platform.manage_roles",
  ],
};

export function getPermissionsForRoles(roles: readonly string[]): Permission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []))];
}
