"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ArtistJourneySummary } from "@/lib/api/schemas";

// Confirmación de borrar una discografía desde el listado de /me/progress (openspec: refine-progress-page-phase1, D2).
// Nombra al artista, dice que se pierde la selección y que las escuchas siguen en el diario. El tamaño de la selección
// no es lo que falta escuchar, así que no contradice el progreso discreto.
export function ArtistJourneyDeleteDialog({
  journey,
  onConfirm,
  onCancel,
}: {
  /** El recorrido a borrar; `null` cierra el diálogo. */
  journey: ArtistJourneySummary | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("artistJourney");
  return (
    <ConfirmDialog
      open={journey !== null}
      title={journey ? t("deleteDialogTitle", { artist: journey.artistName }) : ""}
      message={journey ? t("deleteDialogMessage", { count: journey.progress.selectedCount }) : ""}
      confirmLabel={t("deleteDialogConfirm")}
      cancelLabel={t("cancel")}
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
