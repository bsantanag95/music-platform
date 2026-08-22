"use client";

import { useTranslations } from "next-intl";
import { REACTION_ICONS } from "./ReactionIcons";
import type { ListenReaction } from "@/lib/api/schemas";

// Etiqueta de reacción para listados: texto localizado + icono de refuerzo.
// `null` (ausencia de dato) no renderiza nada — distinto de `neutral`.
export function ReactionBadge({ reaction }: { reaction: ListenReaction | null }) {
  const t = useTranslations("diary");
  if (!reaction) return null;
  return (
    <span className="inline-flex items-center gap-1 text-paper">
      <span aria-hidden="true" className="text-paper-muted">
        {REACTION_ICONS[reaction]}
      </span>
      {t(`reaction.${reaction}`)}
    </span>
  );
}