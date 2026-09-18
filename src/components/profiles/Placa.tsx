import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FollowButton } from "@/components/social/FollowButton";
import { BlockButton } from "@/components/social/BlockButton";
import { ProfileModerationActions } from "@/components/profiles/ProfileModerationActions";
import { MutualFollowersRow } from "@/components/profiles/MutualFollowersRow";
import { monogramLetter, monogramStyle } from "@/components/social/monogram";
import type { ProfileView } from "@/services/profiles/profile-view";
import type { MutualFollowersPreview } from "@/services/profiles/affinity";

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
  /** El visitante tiene `moderation.suspend_social`: habilita suspender desde el perfil. */
  canModerate?: boolean;
  /** Primer seguidor en común + total, o `null`/`undefined` si no hay ninguno. */
  mutualFollowers?: MutualFollowersPreview | null;
}

// La Placa: el objeto identidad del perfil, presente en las tres vistas
// (privada sin autorización, pública/seguidor, dueño). Tratada como una
// tarjeta de vinilo — card con borde, monograma circular (mismo lenguaje que
// la Tarjeta de Identidad y el hover card), contadores como pills, y el
// clúster "quién soy para vos" (relación + acciones) al extremo, separado
// por un divisor cuando queda apilado debajo del contenido. Ver DESIGN.md
// ("The Vinyl Listening Room") y el spec social-profiles. Rediseño "Opción B"
// elegido entre mockups estáticos (ver memoria profile-redesign).
export async function Placa({
  profile,
  authenticated,
  variant = "full",
  preview,
  canModerate = false,
  mutualFollowers,
}: PlacaProps) {
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
      className={`flex w-full flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4 ${
        aside ? "" : "max-w-2xl sm:flex-row sm:items-start sm:justify-between sm:gap-6"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden="true"
            className={`flex ${aside ? "size-14" : "size-16"} shrink-0 items-center justify-center rounded-full border font-display text-2xl ${monogramStyle(
              profile.username,
            )}`}
          >
            {monogramLetter(name)}
          </span>

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
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/users/${profile.username}/connections/followers`}
            className="inline-flex items-baseline gap-1 rounded-full border border-ink-border px-3 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper"
          >
            <span className="text-amber">{profile.followerCount}</span> {t("profileMetaFollowers")}
          </Link>
          <Link
            href={`/users/${profile.username}/connections/following`}
            className="inline-flex items-baseline gap-1 rounded-full border border-ink-border px-3 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper"
          >
            <span className="text-amber">{profile.followingCount}</span> {t("profileMetaFollowing")}
          </Link>
        </div>

        <p className="font-data text-xs text-paper-muted">
          {t("memberSince", {
            date: format.dateTime(profile.memberSince, { year: "numeric", month: "long" }),
          })}
          {profile.location && (
            <>
              <span aria-hidden="true"> · </span>
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

        {mutualFollowers && (
          <MutualFollowersRow
            username={profile.username}
            total={mutualFollowers.total}
            first={mutualFollowers.first}
          />
        )}
      </div>

      <div
        className={`flex flex-col items-stretch gap-2 border-t border-ink-border pt-3 ${
          aside ? "" : "sm:shrink-0 sm:items-end sm:border-t-0 sm:pt-0"
        }`}
      >
        <FollowButton
          username={profile.username}
          relation={profile.relation}
          authenticated={authenticated}
          requestId={profile.id}
          preview={preview}
        />
        {showBlock && <BlockButton username={profile.username} blocked={profile.blockedByMe} />}
        {showBlock && !preview && (
          <ProfileModerationActions
            userId={profile.id}
            username={profile.username}
            canModerate={canModerate}
          />
        )}
      </div>
    </section>
  );
}
