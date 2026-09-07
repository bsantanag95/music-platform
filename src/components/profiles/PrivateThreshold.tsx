import { getTranslations } from "next-intl/server";
import { FollowButton } from "@/components/social/FollowButton";
import type { FollowRelation } from "@/lib/api/schemas";

interface PrivateThresholdProps {
  username: string;
  relation: FollowRelation;
  authenticated: boolean;
  /** id del dueño, para `FollowButton` cuando hay una solicitud entrante. */
  ownerId: string;
  /** Seguidores en común entre el visitante y el dueño (0 = no mostrar). */
  mutualFollowers: number;
}

// El aviso de puerta cerrada: lo que ve un visitante no autorizado sobre un
// perfil privado. No es un error — es una superficie tranquila con el disco de
// vinilo como marca de agua, el motivo en serif y el CTA de seguir repetido.
// Ver DESIGN.md y el spec social-profiles ("Composición del perfil por nivel
// de acceso").
export async function PrivateThreshold({
  username,
  relation,
  authenticated,
  ownerId,
  mutualFollowers,
}: PrivateThresholdProps) {
  const t = await getTranslations("users");

  return (
    <section
      className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-ink-border bg-ink-surface px-6 py-10"
      aria-labelledby="private-threshold-title"
    >
      {/* Disco de vinilo como marca de agua (decorativo). */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 size-56 opacity-40">
        <div className="absolute inset-[15%] rounded-full border border-paper-muted/30" />
        <div className="absolute inset-[35%] rounded-full border border-paper-muted/30" />
        <div className="absolute inset-[48%] rounded-full bg-paper-muted/20" />
      </div>

      <div className="relative flex flex-col gap-4">
        <p className="font-data text-xs uppercase tracking-wide text-paper-muted">
          {t("privateNoticeEyebrow")}
        </p>
        <h2 id="private-threshold-title" className="font-display text-xl text-paper">
          {t("privateNoticeTitle")}
        </h2>
        <p className="max-w-prose font-body text-sm text-paper-muted">
          {t("privateNoticeBody", { username })}
        </p>

        {mutualFollowers > 0 && (
          <p className="font-data text-xs text-paper-muted">
            {t("privateNoticeMutual", { count: mutualFollowers })}
          </p>
        )}

        <div className="pt-1">
          <FollowButton
            username={username}
            relation={relation}
            authenticated={authenticated}
            requestId={ownerId}
          />
        </div>
      </div>
    </section>
  );
}
