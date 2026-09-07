import { getFormatter, getTranslations } from "next-intl/server";
import { FollowButton } from "@/components/social/FollowButton";
import { BlockButton } from "@/components/social/BlockButton";
import { monogramLetter, monogramStyle } from "@/components/social/monogram";
import type { ProfileView } from "@/services/profiles/profile-view";

interface PlacaProps {
  profile: ProfileView;
  authenticated: boolean;
  /**
   * "full" (por defecto): fila en escritorio, acción al extremo derecho.
   * "aside": siempre en columna, para la barra lateral de la vista pública.
   */
  variant?: "full" | "aside";
  /** Previsualización "cómo te ven": el clúster de acciones se muestra inerte. */
  preview?: boolean;
}

// La Placa: el objeto identidad del perfil, presente en las tres vistas
// (privada sin autorización, pública/seguidor, dueño). Tratada como el lomo de
// una funda de vinilo — monograma, nombre en display, dato en mono, bio en
// serif, y el clúster "quién soy para vos" (relación + acciones) al extremo.
// Ver DESIGN.md ("The Vinyl Listening Room") y el spec social-profiles.
export async function Placa({ profile, authenticated, variant = "full", preview }: PlacaProps) {
  const t = await getTranslations("users");
  const format = await getFormatter();
  const name = profile.displayName ?? profile.username;
  const showBlock =
    authenticated &&
    !preview &&
    profile.relation !== "self" &&
    !(profile.relation === "blocked" && !profile.blockedByMe);
  const aside = variant === "aside";

  return (
    <section
      className={
        aside
          ? "flex w-full flex-col gap-4"
          : "flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
      }
    >
      <div className="flex min-w-0 gap-4">
        <span
          aria-hidden="true"
          className={`flex ${aside ? "size-14" : "size-16"} shrink-0 items-center justify-center rounded-lg border font-display text-2xl ${monogramStyle(
            profile.username,
          )}`}
        >
          {monogramLetter(name)}
        </span>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="min-w-0">
            <h1 className={`truncate font-display ${aside ? "text-xl" : "text-2xl"} text-paper`}>
              {name}
            </h1>
            <p className="font-data text-sm text-paper-muted">
              <span>@{profile.username}</span>
              {profile.pronouns && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span>{profile.pronouns}</span>
                </>
              )}
            </p>
          </div>

          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-data text-xs text-paper-muted">
            <span>
              <span className="text-paper">{profile.followerCount}</span> {t("profileMetaFollowers")}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <span className="text-paper">{profile.followingCount}</span> {t("profileMetaFollowing")}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {t("memberSince", {
                date: format.dateTime(profile.memberSince, { year: "numeric", month: "long" }),
              })}
            </span>
            {profile.location && (
              <>
                <span aria-hidden="true">·</span>
                <span>{profile.location}</span>
              </>
            )}
          </p>

          {profile.bio && (
            <p className="max-w-prose font-body text-sm text-paper">{profile.bio}</p>
          )}

          {profile.links.length > 0 && (
            <ul aria-label={t("profileLinksLabel")} className="flex flex-wrap gap-2">
              {profile.links.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center rounded border border-ink-border px-2 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper"
                  >
                    {t(`linkKind.${link.kind}`)}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        className={
          aside
            ? "flex flex-col items-start gap-2"
            : "flex shrink-0 flex-col items-start gap-2 sm:items-end"
        }
      >
        <FollowButton
          username={profile.username}
          relation={profile.relation}
          authenticated={authenticated}
          requestId={profile.id}
          preview={preview}
        />
        {showBlock && <BlockButton username={profile.username} blocked={profile.blockedByMe} />}
      </div>
    </section>
  );
}
