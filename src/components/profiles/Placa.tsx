import { getFormatter, getTranslations } from "next-intl/server";
import { FollowButton } from "@/components/social/FollowButton";
import { BlockButton } from "@/components/social/BlockButton";
import { ProfileIdentity } from "@/components/profiles/ProfileIdentity";
import { ProfileModerationActions } from "@/components/profiles/ProfileModerationActions";
import { MutualFollowersRow } from "@/components/profiles/MutualFollowersRow";
import type { ProfileView } from "@/services/profiles/profile-view";
import type { MutualFollowersPreview } from "@/services/profiles/affinity";

interface PlacaProps {
  profile: ProfileView;
  authenticated: boolean;
  /** Previsualización "cómo te ven": el clúster de acciones se muestra inerte. */
  preview?: boolean;
  /** El visitante tiene `moderation.suspend_social`: habilita suspender desde el perfil. */
  canModerate?: boolean;
  /** Primer seguidor en común + total, o `null`/`undefined` si no hay ninguno. */
  mutualFollowers?: MutualFollowersPreview | null;
}

// La Placa: el objeto identidad de un perfil accesible (público, seguidor
// aprobado o dueño), en la barra lateral. Tratada como una tarjeta de vinilo —
// card con borde, la identidad (`ProfileIdentity`) y el clúster "quién soy para
// vos" (relación + acciones) debajo, separado por un divisor. Un perfil
// privado sin acceso no usa la Placa: tiene su propia tarjeta
// (`PrivateProfileCard`). Ver DESIGN.md ("The Vinyl Listening Room") y el spec
// social-profiles. Rediseño "Opción B" elegido entre mockups estáticos (ver
// memoria profile-redesign).
export async function Placa({
  profile,
  authenticated,
  preview,
  canModerate = false,
  mutualFollowers,
}: PlacaProps) {
  const t = await getTranslations("users");
  const format = await getFormatter();
  const showBlock =
    authenticated &&
    !preview &&
    profile.relation !== "self" &&
    !(profile.relation === "blocked" && !profile.blockedByMe);

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <ProfileIdentity
          profile={profile}
          t={t}
          memberSinceDate={format.dateTime(profile.memberSince, { year: "numeric", month: "long" })}
          size="sm"
        />

        {mutualFollowers && (
          <MutualFollowersRow
            username={profile.username}
            total={mutualFollowers.total}
            first={mutualFollowers.first}
          />
        )}
      </div>

      <div className="flex flex-col items-stretch gap-2 border-t border-ink-border pt-3">
        <FollowButton
          username={profile.username}
          relation={profile.relation}
          authenticated={authenticated}
          requestId={profile.id}
          preview={preview}
          refreshProfileOnFollow
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
