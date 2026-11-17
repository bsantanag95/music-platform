import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FollowButton } from "@/components/social/FollowButton";
import type { ProfileView } from "@/services/profiles/profile-view";

interface FollowersOnlyNoteProps {
  profile: Pick<ProfileView, "id" | "username" | "relation">;
  authenticated: boolean;
  /** Previsualización "cómo te ven": la acción se muestra inerte. */
  preview?: boolean;
  /** `note`: aviso al final del cuerpo; `empty`: «Nada público por ahora» en lugar del cuerpo. */
  variant: "note" | "empty";
}

// Aviso para quien no sigue un perfil público (openspec: redesign-private-profile-phase2; spec
// social-profiles, "Aviso para quien no sigue un perfil público"). Genérico a propósito: se muestra
// haya o no contenido solo para seguidores y no dice qué ni cuánto, para no revelar que existe
// (spec diary-visibility). La acción es seguir (directo: el perfil es público); con una solicitud
// recibida no hay acción, porque aprobar o rechazar ya está en la cabecera.
export async function FollowersOnlyNote({ profile, authenticated, preview = false, variant }: FollowersOnlyNoteProps) {
  const t = await getTranslations("users");
  const action =
    profile.relation === "incoming" ? null : (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <FollowButton
          username={profile.username}
          relation={profile.relation}
          authenticated={authenticated}
          requestId={profile.id}
          preview={preview}
          refreshProfileOnFollow
        />
        {variant === "empty" && !authenticated && (
          <Link
            href="/auth/register"
            className="font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
          >
            {t("createAccount")}
          </Link>
        )}
      </div>
    );

  if (variant === "empty") {
    return (
      <section aria-labelledby="followers-note-title" className="max-w-[35rem] pb-6 pt-6 sm:pt-10">
        <h2 id="followers-note-title" className="font-display text-2xl tracking-tight text-paper">
          {t("followersNote.emptyTitle")}
        </h2>
        <p className="mt-2 font-body text-[1.0625rem] leading-snug text-paper-muted">
          {t("followersNote.empty", { username: profile.username })}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </section>
    );
  }

  return (
    <aside className="flex flex-col gap-4 border-t border-ink-border pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6">
      <p className="max-w-[52ch] font-body text-base leading-snug text-paper-muted">
        {t("followersNote.note", { username: profile.username })}
      </p>
      {action}
    </aside>
  );
}
