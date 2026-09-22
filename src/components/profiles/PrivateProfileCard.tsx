import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BlockButton } from "@/components/social/BlockButton";
import { FollowButton } from "@/components/social/FollowButton";
import { ProfileIdentity } from "@/components/profiles/ProfileIdentity";
import { ProfileModerationActions } from "@/components/profiles/ProfileModerationActions";
import { EMPTY_PERSONAL_INFO } from "@/lib/personal-info";
import type { ProfileView } from "@/services/profiles/profile-view";

type PrivateState =
  | "anonymous"
  | "none"
  | "requested"
  | "incoming"
  | "blockedByMe"
  | "blockedByThem"
  | "preview";

// Qué está viendo exactamente quien no tiene acceso: define el mensaje, la
// acción y cuánta identidad se muestra. `preview` es el dueño con "cómo te
// ven" (ve lo que ve un anónimo, con la acción inerte).
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

interface PrivateProfileCardProps {
  profile: ProfileView;
  authenticated: boolean;
  /** Seguidores en común entre el visitante y el dueño (0 = no mostrar). */
  mutualFollowers: number;
  /** Previsualización "cómo te ven": la acción de seguir se muestra inerte. */
  preview?: boolean;
  /** El visitante tiene `moderation.suspend_social`. */
  canModerate?: boolean;
}

function LockIcon({ className = "size-3" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

// La tarjeta de un perfil privado para quien no tiene acceso — reemplaza a la
// Placa + el aviso "Este perfil es privado" apilados, con el botón de seguir
// repetido, que había antes (elegido entre mockups: "Opción A, una sola
// tarjeta"). Arriba, la identidad extendida (decisión de producto: bio,
// enlaces y contadores son visibles porque dan razones reales para seguir);
// debajo de un divisor, el estado exacto del visitante y la única acción
// posible. No es un error: es una superficie tranquila, con el disco de vinilo
// como marca de agua. Sin cifras de contenido (nada de "12 entradas en el
// diario": mostraría actividad de una cuenta privada). Ver el spec
// social-profiles ("Composición del perfil por nivel de acceso").
export async function PrivateProfileCard({
  profile,
  authenticated,
  mutualFollowers,
  preview = false,
  canModerate = false,
}: PrivateProfileCardProps) {
  const t = await getTranslations("users");
  const format = await getFormatter();
  const state = privateState(profile, authenticated, preview);
  const blocked = state === "blockedByMe" || state === "blockedByThem";
  // A quien bloqueó la cuenta solo se le muestra nombre y usuario: la bio, los
  // enlaces y los contadores eran una razón para seguir, y esa persona ya no
  // puede seguir.
  const minimal = state === "blockedByThem";
  // Lo que se abre al seguir solo se ofrece a quien realmente podría seguir.
  const showsShelves = state === "anonymous" || state === "none" || state === "requested" || state === "preview";
  const showsMutual = mutualFollowers > 0 && (state === "none" || state === "requested" || state === "incoming");
  const showFooterActions = authenticated && !preview && state !== "blockedByThem";

  const title =
    state === "blockedByMe"
      ? t("privateProfile.titleBlockedByMe")
      : state === "blockedByThem"
        ? t("privateProfile.titleBlockedByThem")
        : t("privateNoticeTitle");
  const shelves = [t("diaryTitle"), t("favoritesTitle"), t("listsTitle"), t("collectionTitle")];

  return (
    <section
      className="relative flex w-full max-w-2xl flex-col gap-4 overflow-hidden rounded-lg border border-ink-border bg-ink-surface p-5"
      aria-labelledby="private-profile-title"
    >
      {/* Disco de vinilo como marca de agua (decorativo). */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 size-56 opacity-40">
        <div className="absolute inset-[15%] rounded-full border border-paper-muted/30" />
        <div className="absolute inset-[35%] rounded-full border border-paper-muted/30" />
        <div className="absolute inset-[48%] rounded-full bg-paper-muted/20" />
      </div>

      <div className="relative">
        {/* País, ciudad y pronombres son de quien tiene acceso al perfil (spec
            profile-personal-info): `getProfileView` ya los vacía, y acá se ignoran aunque el
            objeto los traiga, igual que la ficha musical. */}
        <ProfileIdentity
          profile={{ ...profile, ...EMPTY_PERSONAL_INFO }}
          t={t}
          memberSinceDate={format.dateTime(profile.memberSince, { year: "numeric", month: "long" })}
          counters="plain"
          minimal={minimal}
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-border px-2.5 py-0.5 font-data text-xs text-paper-muted">
              <LockIcon />
              {blocked ? t("privateProfile.chipBlocked") : t("privateProfile.chipPrivate")}
            </span>
          }
        />
      </div>

      <hr className="relative border-0 border-t border-ink-border" />

      <div className="relative flex flex-col gap-3">
        <p className="font-data text-xs uppercase tracking-wide text-paper-muted">
          {blocked ? t("privateProfile.eyebrowBlocked") : t("privateNoticeEyebrow")}
        </p>
        <h2 id="private-profile-title" className="font-display text-xl text-paper">
          {title}
        </h2>
        <p className="max-w-prose font-body text-sm text-paper-muted">
          {t(`privateProfile.body.${state}`, { username: profile.username })}
        </p>

        {showsShelves && (
          <div className="flex flex-col gap-2">
            <p className="font-data text-xs text-paper-muted">{t("privateProfile.opensOnFollow")}</p>
            <ul className="grid grid-cols-2 gap-2">
              {shelves.map((label) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-md border border-dashed border-ink-border px-3 py-2 font-data text-xs text-paper-muted"
                >
                  <LockIcon className="size-3 opacity-80" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showsMutual && (
          <p className="font-data text-xs text-paper-muted">
            {t("privateNoticeMutual", { count: mutualFollowers })}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {state === "blockedByMe" ? (
            <BlockButton username={profile.username} blocked variant="secondary" refreshOnChange />
          ) : state === "blockedByThem" ? null : (
            <FollowButton
              username={profile.username}
              relation={profile.relation}
              authenticated={authenticated}
              requestId={profile.id}
              preview={preview}
              requestApproval
              refreshOnAnyChange
            />
          )}
          {state === "anonymous" && (
            <Link
              href="/auth/register"
              className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
            >
              {t("createAccount")}
            </Link>
          )}
        </div>
      </div>

      {showFooterActions && (
        <div className="relative flex flex-wrap items-center justify-end gap-2">
          {state !== "blockedByMe" && (
            <BlockButton username={profile.username} blocked={false} refreshOnChange />
          )}
          <ProfileModerationActions
            userId={profile.id}
            username={profile.username}
            canModerate={canModerate}
          />
        </div>
      )}
    </section>
  );
}
