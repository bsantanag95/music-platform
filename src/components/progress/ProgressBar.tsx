"use client";

import { useTranslations } from "next-intl";

export type ProgressStep = "notStarted" | "justStarted" | "halfway" | "almostDone" | "complete";

/** Tramo discreto del avance: lo que se anuncia en lugar de una fracción (§6.4.1). */
export function progressStep(listened: number, selected: number): ProgressStep {
  if (selected <= 0 || listened <= 0) return "notStarted";
  const ratio = listened / selected;
  if (ratio >= 1) return "complete";
  if (ratio < 1 / 3) return "justStarted";
  if (ratio < 2 / 3) return "halfway";
  return "almostDone";
}

// Barra de progreso discreta de una discografía o una lista para completar (openspec: refine-progress-page-phase1, D4).
// Para un lector de pantalla es una imagen con una etiqueta por tramos ("Avance: a la mitad"): `progressbar` exigiría un
// valor numérico, y el número es justo lo que el progreso discreto evita. Con la selección vacía no dibuja nada.
export function ProgressBar({
  listened,
  selected,
  className = "w-20",
}: {
  listened: number;
  selected: number;
  className?: string;
}) {
  const t = useTranslations("camino");
  if (selected <= 0) return null;
  const ratio = Math.min(listened / selected, 1);
  return (
    <div
      role="img"
      aria-label={t("progressLabel", { step: t(`progressStep.${progressStep(listened, selected)}`) })}
      className={`h-1 shrink-0 overflow-hidden rounded-full bg-ink-border ${className}`}
    >
      <div className="h-full rounded-full bg-petrol" style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  );
}
