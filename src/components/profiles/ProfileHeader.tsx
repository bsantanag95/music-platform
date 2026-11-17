import type { ReactNode } from "react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FollowButton } from "@/components/social/FollowButton";
import { BlockButton } from "@/components/social/BlockButton";
import { UserAvatar } from "@/components/social/UserAvatar";
import { ProfileLinks } from "@/components/profiles/ProfileLinks";
import { ProfileModerationActions } from "@/components/profiles/ProfileModerationActions";
import { MutualFollowersRow } from "@/components/profiles/MutualFollowersRow";
import { formatLocalTime } from "@/lib/music-identity";
import { countryName, EMPTY_PERSONAL_INFO, isPronounSet } from "@/lib/personal-info";
import { isBlockedState, type PrivateState } from "@/components/profiles/private-state";
import { LockIcon } from "@/components/profiles/LockIcon";
import type { ProfileView } from "@/services/profiles/profile-view";
import type { MutualFollowersPreview } from "@/services/profiles/affinity";

// Tono del perfil (spec social-profiles, "Tono del perfil"): `--profile-tone` lo pone la página;
// sin él, el ámbar. Solo en detalles: las comillas de la bio y la línea inferior de la cabecera.
const TONE_TEXT = "text-[var(--profile-tone,var(--color-amber))]";
const TONE_LINE =
  "shadow-[inset_0_-2px_0_color-mix(in_srgb,var(--profile-tone,var(--color-amber))_70%,transparent)]";

interface ProfileHeaderProps {
  profile: ProfileView;
  authenticated: boolean;
  /** Previsualización "cómo te ven": el clúster de acciones se muestra inerte. */
  preview?: boolean;
  /** El visitante tiene `moderation.suspend_social`: habilita suspender desde el perfil. */
  canModerate?: boolean;
  /** Primer seguidor en común + total, o `null`/`undefined` si no hay ninguno. */
  mutualFollowers?: MutualFollowersPreview | null;
  /** «Identidad musical»: la Tarjeta de Identidad, que llega en su propio `<Suspense>`. */
  identity?: ReactNode;
  /** Botón Compartir (carga su objetivo como anónimo). */
  share?: ReactNode;
  /** Afinidad con el visitante y última señal, cada una en su `<Suspense>`. */
  extras?: ReactNode;
  /** Fondo decorativo: la carátula del álbum definitorio difuminada. */
  backdrop?: ReactNode;
  /**
   * Capa del dueño sobre los datos de la persona (el bloque editable con su panel):
   * recibe la columna de datos y devuelve lo que se dibuja en su lugar.
   */
  wrapDetails?: (details: ReactNode) => ReactNode;
  /**
   * Perfil privado visto por quien no tiene acceso (openspec: redesign-private-profile-phase1):
   * marca «Privado», sin datos personales ni hora local, recuentos como texto y sin las
   * acciones de seguir/bloquear (viven en la franja `PrivateProfileDoor`). En `blockedByThem`
   * solo quedan avatar, nombre y usuario.
   */
  locked?: { state: PrivateState };
}

// Cabecera del perfil accesible (público, seguidor aprobado o dueño), a todo el
// ancho (openspec: redesign-user-profile-phase1, dirección «D2» de los mockups
// de 2026-11): a la izquierda quién es la persona —avatar, nombre como título
// principal, datos de identidad, la bio como cita—, sus acciones y sus
// recuentos; a la derecha la Tarjeta de Identidad bajo «Identidad musical».
// Reemplaza a la Placa de la barra lateral: ya no hay columna fija que le quite
// ancho al contenido. La ficha musical pasa a la franja de identidad que sigue.
// Un perfil privado sin acceso usa la misma cabecera con `locked` (spec social-profiles,
// "Vista del perfil privado sin acceso"). Ver spec social-profiles, "Cabecera del perfil".
export async function ProfileHeader({
  profile,
  authenticated,
  preview,
  canModerate = false,
  mutualFollowers,
  identity,
  share,
  extras,
  backdrop,
  wrapDetails,
  locked,
}: ProfileHeaderProps) {
  const t = await getTranslations("users");
  // Sin acceso: país, ciudad y pronombres son de quien tiene acceso (spec profile-personal-info);
  // `getProfileView` ya los vacía y acá se ignoran aunque el objeto los traiga.
  if (locked) profile = { ...profile, ...EMPTY_PERSONAL_INFO, showLocalTime: false };
  const minimal = locked?.state === "blockedByThem";
  const format = await getFormatter();
  const locale = await getLocale();
  const name = profile.displayName ?? profile.username;
  // La hora local solo aparece si su dueño la activó y la zona es válida; se
  // calcula al renderizar (una pista de contexto, no un reloj).
  const localTime = profile.showLocalTime && profile.timezone ? formatLocalTime(profile.timezone, locale) : null;
  // El país llega ya vaciado para quien no tiene acceso (getProfileView); el nombre se
  // calcula acá, en el servidor, con el idioma de la ruta. «Ciudad, País», sin separadores sobrantes.
  const countryLabel = profile.country ? countryName(profile.country, locale) : null;
  const place = [profile.location, countryLabel].filter(Boolean).join(", ");
  // Pronombres (spec profile-personal-info): la clave de la lista o el texto libre de «Otro».
  const pronounLabel = isPronounSet(profile.pronounSet) ? t(`pronounSet.${profile.pronounSet}`) : profile.pronouns;
  const memberSince = t("memberSince", {
    date: format.dateTime(profile.memberSince, {
      year: "numeric",
      month: "long",
    }),
  });
  const showBlock =
    !locked &&
    authenticated &&
    !preview &&
    profile.relation !== "self" &&
    !(profile.relation === "blocked" && !profile.blockedByMe);

  const details = (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        <UserAvatar
          avatarUrl={profile.avatarUrl}
          username={profile.username}
          name={name}
          size="xl"
          className="size-[4.75rem] border-[3px] border-ink shadow-[0_0_0_1px_var(--color-ink-border)] sm:size-28"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
            <h1
              id="profile-name"
              className="font-display text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[0.95] tracking-tight text-paper [overflow-wrap:anywhere]"
            >
              {name}
            </h1>
            {locked && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-border px-2.5 py-0.5 font-data text-xs text-paper-muted">
                <LockIcon />
                {isBlockedState(locked.state) ? t("privateProfile.chipBlocked") : t("privateProfile.chipPrivate")}
              </span>
            )}
          </div>
          <p className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 font-data text-[0.8125rem] text-paper-muted">
            <span>@{profile.username}</span>
            {pronounLabel && <span aria-label={t("pronounsAria", { pronouns: pronounLabel })}>{pronounLabel}</span>}
            {place && <span>{place}</span>}
            {!minimal && <span>{memberSince}</span>}
            {localTime && <span>{t("profileLocalTime", { time: localTime })}</span>}
          </p>
        </div>
      </div>

      {!minimal && profile.bio && (
        <blockquote className="max-w-[36ch] font-body text-lg italic leading-snug text-paper sm:text-[1.375rem]">
          <p>
            <span aria-hidden="true" className={`mr-0.5 not-italic ${TONE_TEXT}`}>
              «
            </span>
            {profile.bio}
            <span aria-hidden="true" className={`ml-0.5 not-italic ${TONE_TEXT}`}>
              »
            </span>
          </p>
        </blockquote>
      )}

      {!minimal && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {!locked && (
              <FollowButton
                username={profile.username}
                relation={profile.relation}
                authenticated={authenticated}
                requestId={profile.id}
                preview={preview}
                refreshProfileOnFollow
              />
            )}
            {share}
            <ProfileLinks links={profile.links} t={t} />
          </div>
          {locked ? (
            // Sin acceso, los listados de conexiones no se abren: los recuentos son solo texto.
            <p className="flex flex-wrap gap-x-4 gap-y-1 font-data text-sm text-paper-muted">
              <span>
                <span className="mr-1 font-semibold text-paper">{profile.followerCount}</span>
                {t("profileMetaFollowers")}
              </span>
              <span>
                <span className="mr-1 font-semibold text-paper">{profile.followingCount}</span>
                {t("profileMetaFollowing")}
              </span>
            </p>
          ) : (
            <p className="flex flex-wrap gap-x-4 gap-y-1 font-data text-sm text-paper-muted">
              <Link
                href={`/users/${profile.username}/connections/followers`}
                className="transition-colors hover:text-paper"
              >
                <span className="mr-1 font-semibold text-paper">{profile.followerCount}</span>
                {t("profileMetaFollowers")}
              </Link>
              <Link
                href={`/users/${profile.username}/connections/following`}
                className="transition-colors hover:text-paper"
              >
                <span className="mr-1 font-semibold text-paper">{profile.followingCount}</span>
                {t("profileMetaFollowing")}
              </Link>
            </p>
          )}
        </div>
      )}

      {mutualFollowers && (
        <MutualFollowersRow username={profile.username} total={mutualFollowers.total} first={mutualFollowers.first} />
      )}

      {extras}

      {showBlock && (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <BlockButton username={profile.username} blocked={profile.blockedByMe} />
          <ProfileModerationActions userId={profile.id} username={profile.username} canModerate={canModerate} />
        </div>
      )}
    </div>
  );

  return (
    <section
      id="perfil"
      aria-labelledby="profile-name"
      className={`relative isolate w-full scroll-mt-[var(--site-header-h)] overflow-hidden border-b border-ink-border bg-gradient-to-b from-ink-surface/50 to-ink ${TONE_LINE}`}
    >
      {backdrop}
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-8 pt-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,27.5rem)] lg:items-center lg:gap-16 xl:px-6">
        {wrapDetails ? wrapDetails(details) : details}
        {identity}
      </div>
    </section>
  );
}
