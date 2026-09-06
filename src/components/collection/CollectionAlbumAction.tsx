"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { addCollectionEntry, removeCollectionEntry } from "@/lib/api/collection";
import { ApiError } from "@/lib/api/client";
import { type CollectionEntry } from "@/lib/api/schemas";
import {
  CollectionEntryForm,
  EMPTY_ENTRY_FORM,
  type CollectionEntryFormValue,
} from "./CollectionEntryForm";

interface CollectionAlbumActionProps {
  releaseGroupId: string;
  authenticated: boolean;
  initialEntries: CollectionEntry[];
}

// Acción "Agregar a la colección" en la página de álbum. Permite registrar
// una copia física (formato obligatorio, atributos opcionales, nota opcional)
// y ver/quitar las copias propias ya registradas para ese álbum. No bloquea
// la carga del contenido musical: se monta como acción aparte.
export function CollectionAlbumAction({
  releaseGroupId,
  authenticated,
  initialEntries,
}: CollectionAlbumActionProps) {
  const t = useTranslations("collection");
  const [entries, setEntries] = useState<CollectionEntry[]>(initialEntries);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CollectionEntryFormValue>(EMPTY_ENTRY_FORM);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!authenticated) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm text-paper transition-colors hover:border-amber"
      >
        {t("signInToAdd")}
      </Link>
    );
  }

  const handleAdd = async () => {
    setBusy(true);
    setErrorCode(null);
    setStatus(null);
    try {
      const entry = await addCollectionEntry({
        releaseGroupId,
        format: form.format,
        attributes: form.attributes,
        note: form.note.trim() === "" ? null : form.note.trim(),
      });
      setEntries((current) => [entry, ...current]);
      setStatus(t("added", { format: t(`format.${entry.format}`) }));
      setForm(EMPTY_ENTRY_FORM);
      setOpen(false);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (entry: CollectionEntry) => {
    setBusy(true);
    setErrorCode(null);
    setStatus(null);
    try {
      await removeCollectionEntry(entry.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      setStatus(t("removed"));
    } catch (error) {
      if (error instanceof ApiError && error.code === "COLLECTION_ENTRY_NOT_FOUND") {
        setEntries((current) => current.filter((item) => item.id !== entry.id));
      } else {
        setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-2">
      <Button variant="secondary" onClick={() => setOpen((current) => !current)}>
        {t("addToCollection")}
      </Button>

      {entries.length > 0 && (
        <ul className="flex w-full flex-col gap-1.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded border border-ink-border bg-ink-surface px-3 py-2"
            >
              <div className="min-w-0 font-data text-xs text-paper">
                <span className="text-paper">{t(`format.${entry.format}`)}</span>
                {entry.attributes.length > 0 && (
                  <span className="text-paper-muted">
                    {" · "}
                    {entry.attributes.map((attribute) => t(`attribute.${attribute}`)).join(" · ")}
                  </span>
                )}
                {entry.note && (
                  <span className="mt-0.5 block text-paper-muted">{entry.note}</span>
                )}
              </div>
              <Button variant="ghost" disabled={busy} onClick={() => void handleRemove(entry)}>
                {t("remove")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="flex w-full flex-col gap-3 rounded border border-ink-border bg-ink-surface p-3">
          <CollectionEntryForm value={form} onChange={setForm} disabled={busy} />
          <Button variant="primary" disabled={busy} onClick={() => void handleAdd()}>
            {busy ? t("saving") : t("confirmAdd")}
          </Button>
        </div>
      )}

      <span role="status" aria-live="polite" className="font-data text-xs text-paper-muted">
        {status}
      </span>
      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      )}
    </div>
  );
}
