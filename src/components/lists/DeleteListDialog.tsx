"use client";

import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Confirmación de borrado de una lista propia, compartida por la tarjeta de Mis listas y el detalle
// (openspec: refine-me-lists-page-phase1, D5). Nombra la lista y cuántos elementos se pierden: el borrado es físico y
// no tiene deshacer.
export function DeleteListDialog({
  list,
  onConfirm,
  onCancel,
}: {
  /** La lista a borrar; `null` cierra el diálogo. */
  list: { title: string; itemCount: number } | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("lists");
  return (
    <ConfirmDialog
      open={list !== null}
      title={list ? t("deleteDialogTitle", { title: list.title }) : ""}
      message={list ? t("deleteDialogMessage", { count: list.itemCount }) : ""}
      confirmLabel={t("deleteDialogConfirm")}
      cancelLabel={t("cancel")}
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
