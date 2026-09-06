"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { CollectionEntry, DiaryAudience } from "@/lib/api/schemas";
import { CollectionEntryForm } from "./CollectionEntryForm";
import { entryToFormValue, type CollectionRowActions } from "./collection-shared";

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

// Controles de gestión de una entrada, compartidos por los modos Lista detallada
// e Índice. En reposo: selector rápido de audiencia + editar + quitar. En
// edición: el formulario completo con guardar / cancelar.
export function CollectionEntryControls({
  entry,
  actions,
}: {
  entry: CollectionEntry;
  actions: CollectionRowActions;
}) {
  const t = useTranslations("collection");
  const editing = actions.editingId === entry.id;
  const busy = actions.busyId === entry.id;
  const [draft, setDraft] = useState(() => entryToFormValue(entry));

  if (editing) {
    return (
      <div className="mt-2 flex w-full flex-col gap-3 rounded border border-ink-border bg-ink p-3">
        <CollectionEntryForm value={draft} onChange={setDraft} showAudience disabled={busy} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => actions.onSaveEdit(entry, draft)}
          >
            {busy ? t("saving") : t("saveEdit")}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={actions.onCancelEdit}>
            {t("cancelEdit")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`collection-audience-${entry.id}`}>
        {t("audienceLabel")}
      </label>
      <select
        id={`collection-audience-${entry.id}`}
        value={entry.audience}
        disabled={busy}
        onChange={(event) =>
          actions.onAudienceChange(entry, event.target.value as DiaryAudience)
        }
        className="filter-select rounded border border-ink-border bg-ink px-2 py-1 font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-50"
      >
        {AUDIENCES.map((audience) => (
          <option key={audience} value={audience}>
            {t(`audience.${audience}`)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setDraft(entryToFormValue(entry));
          actions.onStartEdit(entry.id);
        }}
        className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper disabled:opacity-50"
      >
        {t("editEntry")}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => actions.onRemove(entry)}
        className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-danger disabled:opacity-50"
      >
        {t("remove")}
      </button>
    </div>
  );
}
