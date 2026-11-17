import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BlockButton } from "@/components/social/BlockButton";
import { FollowButton } from "@/components/social/FollowButton";
import { LockIcon } from "@/components/profiles/LockIcon";
import { ProfileModerationActions } from "@/components/profiles/ProfileModerationActions";
import { privateState } from "@/components/profiles/private-state";
import type { ProfileView } from "@/services/profiles/profile-view";

interface PrivateProfileDoorProps {
  profile: ProfileView;
  authenticated: boolean;
  /** Seguidores en común entre el visitante y el dueño (0 = no mostrar). */
  mutualFollowers: number;
  /** Previsualización "cómo te ven": la acción de seguir se muestra inerte. */
  preview?: boolean;
  /** El visitante tiene `moderation.suspend_social`. */
  canModerate?: boolean;
}

// Forma de cada sección que se abre al seguir: barras para las que son filas (Diario,
// Colección), cuadros para las que son carátulas (Favoritos, Listas).
const GHOSTS = [
  { key: "diaryTitle", shape: "bars" },
  { key: "favoritesTitle", shape: "tiles" },
  { key: "listsTitle", shape: "tiles" },
  { key: "collectionTitle", shape: "bars" },
] as const;

const BAR_WIDTHS = ["w-[92%]", "w-[74%]", "w-[84%]"];

// La franja de un perfil privado para quien no tiene acceso (openspec:
// redesign-private-profile-phase1, propuesta «A · Cabecera continua» de los mockups de
// 2026-11): debajo de la misma cabecera del perfil, a todo el ancho, el estado de quien
// mira en un título y una oración, su única acción y, a la derecha, las siluetas de lo que
// se abre al seguir. Las siluetas son siempre las cuatro y no llevan ningún dato, recuento
// ni carátula: mostrarían actividad de una cuenta privada. Ver spec social-profiles,
// "Vista del perfil privado sin acceso".
export async function PrivateProfileDoor({
  profile,
  authenticated,
  mutualFollowers,
  preview = false,
  canModerate = false,
}: PrivateProfileDoorProps) {
  const t = await getTranslations("users");
  const state = privateState(profile, authenticated, preview);
  // Lo que se abre al seguir solo se ofrece a quien realmente podría seguir.
  const showsGhosts = state === "anonymous" || state === "none" || state === "requested" || state === "preview";
  const showsMutual = mutualFollowers > 0 && (state === "none" || state === "requested" || state === "incoming");
  const showsFooter = authenticated && !preview && state !== "blockedByThem";

  return (
    <section aria-labelledby="private-profile-title" className="w-full border-b border-ink-border">
      <div
        className={`mx-auto grid w-full max-w-7xl items-start gap-8 px-4 pb-10 pt-9 xl:px-6 ${
          showsGhosts ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16" : ""
        }`}
      >
        <div className="min-w-0">
          <h2
            id="private-profile-title"
            className="flex items-center gap-2.5 font-display text-[1.375rem] tracking-tight text-paper sm:text-[1.625rem]"
          >
            <LockIcon className="size-5 shrink-0 text-[var(--profile-tone,var(--color-amber))]" />
            {t(`privateProfile.title.${state}`)}
          </h2>
          <p className="mt-2.5 max-w-[42ch] font-body text-[1.0625rem] leading-snug text-paper-muted">
            {t(`privateProfile.body.${state}`, { username: profile.username })}
          </p>

          {state !== "blockedByThem" && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
              {state === "blockedByMe" ? (
                <BlockButton username={profile.username} blocked variant="secondary" refreshOnChange />
              ) : (
                <FollowButton
                  username={profile.username}
                  relation={profile.relation}
                  authenticated={authenticated}
                  requestId={profile.id}
                  preview={preview}
                  requestApproval
                  requestedLabel={t("privateProfile.pending")}
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
          )}

          {showsMutual && (
            <p className="mt-3 font-data text-xs text-paper-muted">
              {t("privateNoticeMutual", { count: mutualFollowers })}
            </p>
          )}

          {showsFooter && (
            <div className="mt-6 flex flex-wrap items-start gap-x-4 gap-y-2">
              {state !== "blockedByMe" && <BlockButton username={profile.username} blocked={false} refreshOnChange />}
              <ProfileModerationActions userId={profile.id} username={profile.username} canModerate={canModerate} />
            </div>
          )}
        </div>

        {showsGhosts && (
          <div aria-hidden="true" data-testid="private-ghosts" className="grid gap-3.5 sm:grid-cols-2">
            {GHOSTS.map(({ key, shape }) => (
              <div key={key} className="border-t border-ink-border pt-3">
                <p className="mb-2.5 flex items-center gap-1.5 font-data text-xs uppercase tracking-wide text-paper-muted">
                  <LockIcon className="size-3" />
                  {t(key)}
                </p>
                {shape === "bars" ? (
                  <div className="flex flex-col gap-2.5">
                    {BAR_WIDTHS.map((width) => (
                      <i key={width} className={`block h-2.5 rounded-[3px] bg-ink-surface ${width}`} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((n) => (
                      <i key={n} className="block aspect-square rounded-[5px] bg-ink-surface" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
