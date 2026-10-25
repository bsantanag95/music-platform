"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { CollectionEntry } from "@/lib/api/schemas";
import { CollectionEntryForm, type CollectionEntryFormValue } from "./CollectionEntryForm";
import { albumByline, entryToFormValue } from "./collection-shared";

interface CollectionEditSheetProps {
  entry: CollectionEntry;
  busy: boolean;
  error: boolean;
  onSave: (entry: CollectionEntry, value: CollectionEntryFormValue) => void;
  onCancel: () => void;
  onRemove: (entry: CollectionEntry) => void;
}

// Hoja lateral de edición de una copia (openspec: redesign-collection-views, D2): el mismo formulario que el alta, con
// los atributos agrupados, sin desplazar la página. Al pie, "Quitar de la colección" (con el deshacer de la estantería),
// Cancelar y Guardar. Se monta con `key={entry.id}`, así el borrador arranca de la copia elegida.
export function CollectionEditSheet({ entry, busy, error, onSave, onCancel, onRemove }: CollectionEditSheetProps) {
  const t = useTranslations("collection");
  const [draft, setDraft] = useState<CollectionEntryFormValue>(() => entryToFormValue(entry));

  return (
    <Dialog open title={t("editCopyTitle")} onClose={onCancel} size="sheet">
      <p className="-mt-2 font-data text-xs text-paper-muted">
        <span className="font-display text-sm text-paper">{entry.album.title || t("albumUnavailable")}</span>
        {albumByline(entry.album) ? ` · ${albumByline(entry.album)}` : null}
      </p>
      <CollectionEntryForm
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
          {t("removeFromCollection")}
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
