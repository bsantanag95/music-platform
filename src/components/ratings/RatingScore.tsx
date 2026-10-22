"use client";

import { useTranslations } from "next-intl";
import type { MyRatingEntry } from "@/lib/api/schemas";

interface RatingScoreProps {
  entry: MyRatingEntry;
  /** Abre el diálogo de puntaje (elevado al orquestador) con la valoración de la entrada. */
  onEdit: (entry: MyRatingEntry) => void;
  /** Nombre accesible del botón: cada vista conserva el suyo (p. ej. `86/100` o "Editar la nota de …"). */
  ariaLabel: string;
  /** `full`: `86/100` con `/100` atenuado; `compact`: solo `86`, para la ficha estrecha del modo Gráfico. */
  variant?: "full" | "compact";
  className?: string;
}

// Botón del puntaje detallado, compartido por las tres vistas (openspec: redesign-ratings-views). Con
// puntaje muestra `86/100` en tipografía de datos; sin puntaje, un guion atenuado con la ayuda "Sin afinar",
// en vez de repetir esa frase en cada entrada (no tener puntaje es lo normal). En ambos casos es la acción
// que abre el diálogo de puntaje, con 44 px de alto con puntero grueso.
export function RatingScore({ entry, onEdit, ariaLabel, variant = "full", className = "" }: RatingScoreProps) {
  const t = useTranslations("ratings");
  const score = entry.detailedScore;

  return (
    <button
      type="button"
      onClick={() => onEdit(entry)}
      aria-label={ariaLabel}
      title={score === null ? t("untuned") : undefined}
      className={`inline-flex items-center justify-end whitespace-nowrap rounded px-1 py-0.5 font-data text-xs tabular-nums transition-colors hover:text-amber [@media(pointer:coarse)]:min-h-11 ${
        score === null ? "text-paper-muted" : "text-paper"
      } ${className}`}
    >
      {score === null ? (
        <span aria-hidden>—</span>
      ) : (
        <>
          {score}
          {variant === "full" ? <span className="text-paper-muted">/100</span> : null}
        </>
      )}
    </button>
  );
}
