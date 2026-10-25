"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { WantedEntry } from "@/lib/api/schemas";
import { WantedVariantForm, wantedEntryToFormValue, type WantedVariantFormValue } from "./WantedVariantForm";
import { albumByline } from "./collection-shared";

interface WantedEditSheetProps {
  entry: WantedEntry;
  busy: boolean;
  error: boolean;
  onSave: (entry: WantedEntry, value: WantedVariantFormValue) => void;
  onCancel: () => void;
  onRemove: (entry: WantedEntry) => void;
}

// Hoja lateral de edición de una variante buscada: misma forma que la de Tengo (`CollectionEditSheet`) con el
// formulario de la búsqueda ("cualquier formato" y "cualquier edición" incluidos).
export function WantedEditSheet({ entry, busy, error, onSave, onCancel, onRemove }: WantedEditSheetProps) {
  const t = useTranslations("collection");
  const [draft, setDraft] = useState<WantedVariantFormValue>(() => wantedEntryToFormValue(entry));

  return (
    <Dialog open title={t("editWantedTitle")} onClose={onCancel} size="sheet">
      <p className="-mt-2 font-data text-xs text-paper-muted">
        <span className="font-display text-sm text-paper">{entry.album.title || t("albumUnavailable")}</span>
        {albumByline(entry.album) ? ` · ${albumByline(entry.album)}` : null}
      </p>
      <WantedVariantForm
        value={draft}
        onChange={setDraft}
        showAudience
        disabled={busy}
        savedAttributes={entry.attributes}
      />
      {error ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-border pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => onRemove(entry)}
          className="mr-auto font-data text-xs text-danger transition-colors hover:underline disabled:opacity-50 [@media(pointer:coarse)]:min-h-11"
        >
          {t("removeFromSearch")}
        </button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          {t("cancelEdit")}
        </Button>
        <Button variant="primary" disabled={busy} onClick={() => onSave(entry, draft)}>
          {busy ? t("saving") : t("saveEdit")}
        </Button>
      </div>
    </Dialog>
  );
}
