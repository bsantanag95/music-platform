"use client";

import { useTranslations } from "next-intl";

interface CaminoDeleteConfirmProps {
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Tamaño de fuente del bloque; los modos más compactos usan uno menor. */
  sizeClassName?: string;
}

// Segundo paso de la confirmación de eliminar un Camino propio, calcado de
// `ArtistJourneyDeleteConfirm`: reemplaza el estado/menú de la entrada
// mientras está pendiente. Compartido por los tres modos de visualización.
export function CaminoDeleteConfirm({
  busy,
  onConfirm,
  onCancel,
  sizeClassName = "text-xs",
}: CaminoDeleteConfirmProps) {
  const t = useTranslations("camino");

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-data ${sizeClassName}`}>
      <span role="alert" className="text-danger">
        {busy ? t("deleting") : t("confirmDelete")}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-50"
      >
        {t("delete")}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="text-paper-muted transition-colors hover:text-paper disabled:opacity-50"
      >
        {t("cancel")}
      </button>
    </div>
  );
}
