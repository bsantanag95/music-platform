import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { monogramLetter, monogramStyle } from "@/components/social/monogram";
import { describeStoredLink } from "@/lib/profile-links";
import { LinkKindIcon } from "./LinkKindIcon";
import type { ProfileView } from "@/services/profiles/profile-view";

interface ProfileIdentityProps {
  profile: ProfileView;
  /**
   * Traductor del namespace `users`, resuelto una sola vez por el Server
   * Component que lo compone (no `async` acá a propósito: un componente async
   * anidado dentro de otro no se resuelve al testear con `render()`).
   */
  t: (key: string, values?: Record<string, string | number>) => string;
  /** Fecha de alta ya formateada (`format.dateTime`), para "Miembro desde …". */
  memberSinceDate: string;
  /** "sm": barra lateral del perfil; "md": tarjeta del perfil privado. */
  size?: "sm" | "md";
  /** "links": contadores enlazados a los listados de conexiones; "plain": solo texto. */
  counters?: "links" | "plain";
  /** Solo nombre y usuario: sin pronombres, contadores, bio ni enlaces. */
  minimal?: boolean;
  /** Elemento junto al nombre (p. ej. el chip "Privado"). */
  badge?: ReactNode;
}

const PILL =
  "inline-flex items-baseline gap-1 rounded-full border border-ink-border px-3 py-1 font-data text-xs text-paper-muted";

// La identidad de una persona en su perfil — monograma circular, nombre,
// usuario y pronombres, contadores de seguidores/seguidos como pills, alta y
// ubicación, bio y enlaces externos. La comparten la Placa (barra lateral de
// un perfil accesible) y la tarjeta de un perfil privado (`PrivateProfileCard`),
// que son la misma persona vista con y sin acceso. Ver DESIGN.md ("The Vinyl
// Listening Room") y el spec social-profiles.
export function ProfileIdentity({
  profile,
  t,
  memberSinceDate,
  size = "md",
  counters = "links",
  minimal = false,
  badge,
}: ProfileIdentityProps) {
  const name = profile.displayName ?? profile.username;
  const compact = size === "sm";

  const followers = (
    <>
      <span className="text-amber">{profile.followerCount}</span> {t("profileMetaFollowers")}
    </>
  );
  const following = (
    <>
      <span className="text-amber">{profile.followingCount}</span> {t("profileMetaFollowing")}
    </>
  );
  const linkedPill = `${PILL} transition-colors hover:border-amber hover:text-paper`;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className={`flex ${compact ? "size-14" : "size-16"} shrink-0 items-center justify-center rounded-full border font-display text-2xl ${monogramStyle(
            profile.username,
          )}`}
        >
          {monogramLetter(name)}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className={`truncate font-display ${compact ? "text-xl" : "text-2xl"} text-paper`}>{name}</h1>
            {badge}
          </div>
          <p className="font-data text-sm text-paper-muted">
            <span>@{profile.username}</span>
            {!minimal && profile.pronouns && (
              <>
                <span aria-hidden="true"> · </span>
                <span>{profile.pronouns}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {!minimal && (
        <>
          <div className="flex flex-wrap gap-2">
            {counters === "links" ? (
              <>
                <Link href={`/users/${profile.username}/connections/followers`} className={linkedPill}>
                  {followers}
                </Link>
                <Link href={`/users/${profile.username}/connections/following`} className={linkedPill}>
                  {following}
                </Link>
              </>
            ) : (
              <>
                <span className={PILL}>{followers}</span>
                <span className={PILL}>{following}</span>
              </>
            )}
          </div>

          <p className="font-data text-xs text-paper-muted">
            {t("memberSince", { date: memberSinceDate })}
            {profile.location && (
              <>
                <span aria-hidden="true"> · </span>
                <span>{profile.location}</span>
              </>
            )}
          </p>

          {profile.bio && <p className="max-w-prose font-body text-sm text-paper">{profile.bio}</p>}

          {profile.links.length > 0 && (
            <ul aria-label={t("profileLinksLabel")} className="flex flex-wrap gap-2">
              {profile.links.map((link) => {
                // Cada enlace es el ícono de su sitio, sin texto visible (spec
                // profile-identity, "Enlaces como íconos en el perfil"): el nombre
                // accesible y el tooltip llevan el sitio y el usuario o el dominio.
                // Un enlace de un tipo por usuario que no coincide con su sitio
                // (dato anterior a la validación) usa el ícono genérico.
                const info = describeStoredLink(link.kind, link.url);
                const site = t(`linkKind.${link.kind}`);
                const label = info.detail ? t("linkAria", { site, detail: info.detail }) : site;
                return (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label={label}
                      title={label}
                      className="inline-flex size-9 items-center justify-center rounded border border-ink-border text-paper-muted transition-colors hover:border-amber hover:text-paper"
                    >
                      <LinkKindIcon kind={link.kind} generic={!info.consistent} className="size-[1.1rem]" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
