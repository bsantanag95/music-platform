export type Permission =
  | "moderation.review_content"
  | "moderation.suspend_social"
  | "editorial.publish"
  | "platform.manage_roles";

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  moderator: ["moderation.review_content", "moderation.suspend_social"],
  admin: [
    "moderation.review_content",
    "moderation.suspend_social",
    "editorial.publish",
    "platform.manage_roles",
  ],
};

export function getPermissionsForRoles(roles: readonly string[]): Permission[] {
  return [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []))];
}
