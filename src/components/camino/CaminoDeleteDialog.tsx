"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CaminoSummary } from "@/lib/api/schemas";

// Confirmación de borrar una lista para completar desde Mis listas de /me/progress (openspec:
// refine-progress-page-phase1, D2): nombra la lista, cuántos álbumes se pierden y que las escuchas siguen en el diario.
export function CaminoDeleteDialog({
  camino,
  onConfirm,
  onCancel,
}: {
  /** El Camino a borrar; `null` cierra el diálogo. */
  camino: CaminoSummary | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("camino");
  return (
    <ConfirmDialog
      open={camino !== null}
      title={camino ? t("deleteDialogTitle", { title: camino.title }) : ""}
      message={camino ? t("deleteDialogMessage", { count: camino.progress.selectedCount }) : ""}
      confirmLabel={t("deleteDialogConfirm")}
      cancelLabel={t("cancel")}
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
