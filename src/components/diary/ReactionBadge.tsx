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

// Ícono de reacción del diario propio (openspec: redesign-diary-row):
// excepción puntual y acotada a esta señal de una sola fila — solo ícono, sin
// el texto siempre visible que exige `ReactionBadge` en el resto del sistema
// (feed, panel de ampliación). El nombre localizado sigue disponible como
// nombre accesible (`aria-label`) y como texto al pasar el mouse (`title`).
//
// El slot SIEMPRE se renderiza con su ancho fijo, tenga o no reacción la
// entrada — a diferencia de un primer pase que retornaba `null` sin reacción:
// eso hacía que el resto de los íconos de la fila (lápiz, menú "···") se
// corrieran de posición entre una fila con reacción y otra sin ella. Al
// reservar el espacio siempre, esos íconos quedan anclados en el mismo lugar
// en todas las filas; sin reacción, el slot queda decorativo y vacío
// (`aria-hidden`, sin `role="img"`) — nunca un ícono neutro por defecto, para
// no confundir ausencia con reacción `neutral` explícita.
export function ReactionGlyph({ reaction }: { reaction: ListenReaction | null }) {
  const t = useTranslations("diary");
  const label = reaction ? t(`reaction.${reaction}`) : undefined;
  return (
    <span
      role={reaction ? "img" : undefined}
      aria-hidden={reaction ? undefined : true}
      aria-label={label}
      title={label}
      className="flex w-5 shrink-0 items-center justify-center text-paper-muted [&>svg]:h-[18px] [&>svg]:w-[18px]"
    >
      {reaction ? REACTION_ICONS[reaction] : null}
    </span>
  );
}