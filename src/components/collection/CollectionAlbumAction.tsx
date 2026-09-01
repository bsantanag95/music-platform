"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { addCollectionEntry, removeCollectionEntry } from "@/lib/api/collection";
import { ApiError } from "@/lib/api/client";
import { COLLECTION_FORMATS, EDITION_ATTRIBUTES } from "@/services/collection/vocabulary";
import { COLLECTION_NOTE_MAX, type CollectionEntry } from "@/lib/api/schemas";
import type { CollectionFormat, EditionAttribute } from "@/services/collection/vocabulary";

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
  const [format, setFormat] = useState<CollectionFormat>("vinyl");
  const [attributes, setAttributes] = useState<EditionAttribute[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const formId = useId();

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

  const toggleAttribute = (attribute: EditionAttribute) => {
    setAttributes((current) =>
      current.includes(attribute)
        ? current.filter((value) => value !== attribute)
        : [...current, attribute],
    );
  };

  const resetForm = () => {
    setFormat("vinyl");
    setAttributes([]);
    setNote("");
  };

  const handleAdd = async () => {
    setBusy(true);
    setErrorCode(null);
    setStatus(null);
    try {
      const entry = await addCollectionEntry({
        releaseGroupId,
        format,
        attributes,
        note: note.trim() === "" ? null : note.trim(),
      });
      setEntries((current) => [entry, ...current]);
      setStatus(t("added", { format: t(`format.${entry.format}`) }));
      resetForm();
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
          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
            {t("formatLabel")}
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as CollectionFormat)}
              className="rounded border border-ink-border bg-ink px-2 py-1.5 font-data text-sm text-paper"
            >
              {COLLECTION_FORMATS.map((value) => (
                <option key={value} value={value}>
                  {t(`format.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex flex-col gap-1">
            <legend className="font-data text-xs text-paper-muted">{t("attributesLabel")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {EDITION_ATTRIBUTES.map((attribute) => (
                <label
                  key={attribute}
                  className={`cursor-pointer rounded border px-2 py-1 font-data text-xs transition-colors ${
                    attributes.includes(attribute)
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-ink-border text-paper-muted hover:text-paper"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={attributes.includes(attribute)}
                    onChange={() => toggleAttribute(attribute)}
                  />
                  {t(`attribute.${attribute}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1 font-data text-xs text-paper-muted" htmlFor={formId}>
            {t("noteLabel")}
            <input
              id={formId}
              type="text"
              value={note}
              maxLength={COLLECTION_NOTE_MAX}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("notePlaceholder")}
              className="rounded border border-ink-border bg-ink px-2 py-1.5 font-data text-sm text-paper"
            />
          </label>

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
