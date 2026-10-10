"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Audience } from "@/services/social/types";

interface AudienceNoteProps {
  kind: "favorites" | "diary";
  /** Audiencia efectiva con la que nace el contenido nuevo del usuario (la calcula el servidor). */
  audience: Audience;
}

// Aviso de con quién se comparte lo que se elige en un paso del onboarding. La audiencia llega ya
// resuelta por la misma regla que usan los servicios al crear contenido, así que nunca contradice
// lo que se guarda. El enlace a Privacidad se abre en otra pestaña para no perder lo elegido.
export function AudienceNote({ kind, audience }: AudienceNoteProps) {
  const t = useTranslations("onboarding.audience");
  return (
    <p className="flex flex-wrap items-center gap-x-2 font-data text-xs text-paper-muted">
      <span>{t(kind, { audience: t(audience) })}</span>
      <Link
        href="/me/settings/privacy"
        target="_blank"
        className="-my-3.5 inline-flex min-h-11 items-center underline hover:text-paper sm:my-0 sm:min-h-0"
      >
        {t("change")}
      </Link>
    </p>
  );
}
