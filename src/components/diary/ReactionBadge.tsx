"use client";

import { useTranslations } from "next-intl";
import { REACTION_ICONS } from "./ReactionIcons";
import type { ListenReaction } from "@/lib/api/schemas";

// Etiqueta de reacción para listados: texto localizado + icono de refuerzo.
// `null` (ausencia de dato) no renderiza nada — distinto de `neutral`.
// `className` es un extra opcional (ej. `align-middle`) para cuando el badge se
// intercala como texto corrido junto a otros caracteres: el ícono SVG hace que
// el navegador alinee la caja `inline-flex` por su borde inferior en vez de la
// línea de base real, y el badge queda visiblemente más arriba que el texto
// que lo rodea. Como flex sibling bajo `items-baseline` (ver `FeedActivityList`)
// no hace falta — el propio flexbox ya resuelve la alineación.
export function ReactionBadge({
  reaction,
  className = "",
}: {
  reaction: ListenReaction | null;
  className?: string;
}) {
  const t = useTranslations("diary");
  if (!reaction) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-paper ${className}`}>
      <span aria-hidden="true" className="text-paper-muted">
        {REACTION_ICONS[reaction]}
      </span>
      {t(`reaction.${reaction}`)}
    </span>
  );
}