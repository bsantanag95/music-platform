"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { addCollectionEntry, removeCollectionEntry } from "@/lib/api/collection";
import { addWantedEntries, removeWantedEntry } from "@/lib/api/wanted";
import { ApiError } from "@/lib/api/client";
import { type CollectionEntry, type WantedEntry } from "@/lib/api/schemas";
import {
  CollectionEntryForm,
  EMPTY_ENTRY_FORM,
  type CollectionEntryFormValue,
} from "./CollectionEntryForm";
import { WantedVariantForm, EMPTY_WANTED_VARIANT, type WantedVariantFormValue } from "./WantedVariantForm";

const MAX_WANTED_VARIANTS = 10;

interface CollectionAlbumActionProps {
  releaseGroupId: string;
  authenticated: boolean;
  initialEntries: CollectionEntry[];
  initialWantedEntries: WantedEntry[];
  /** Deep-link desde el menú "···" de `AlbumCard`: abre el panel ya en "La tengo" o "La quiero". */
  initialChoice?: "have" | "want";
  /** Se llama cuando cambian las copias o los deseos propios (panel "Tu relación" del álbum). */
  onEntriesChange?: (entries: CollectionEntry[], wantedEntries: WantedEntry[]) => void;
}

function formatLabel(format: string | null, t: ReturnType<typeof useTranslations>): string {
  return format ? t(`format.${format}`) : t("anyFormat");
}

// Acción de colección en la página de álbum: un único punto de entrada que,
// al abrirse, ofrece elegir entre "La tengo" (colección física) y "La
// quiero" (wishlist) en vez de dos botones separados — ver design.md D7 de
// add-collection-wishlist. Ambos listados (copias propias y deseos propios)
// se muestran por separado, siempre que existan, sin necesidad de abrir el
// selector.
export function CollectionAlbumAction({
  releaseGroupId,
  authenticated,
  initialEntries,
  initialWantedEntries,
  initialChoice,
  onEntriesChange,
}: CollectionAlbumActionProps) {
  const t = useTranslations("collection");
  const [entries, setEntries] = useState<CollectionEntry[]>(initialEntries);
  const [wantedEntries, setWantedEntries] = useState<WantedEntry[]>(initialWantedEntries);
  const [open, setOpen] = useState(initialChoice !== undefined);
  const [choice, setChoice] = useState<"have" | "want" | null>(initialChoice ?? null);
  const [form, setForm] = useState<CollectionEntryFormValue>(EMPTY_ENTRY_FORM);
  const [variants, setVariants] = useState<WantedVariantFormValue[]>([EMPTY_WANTED_VARIANT]);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Avisa solo cambios reales, no el estado inicial.
  const onEntriesChangeRef = useRef(onEntriesChange);
  onEntriesChangeRef.current = onEntriesChange;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onEntriesChangeRef.current?.(entries, wantedEntries);
  }, [entries, wantedEntries]);

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

  const selectChoice = (next: "have" | "want") => {
    setChoice(next);
    setErrorCode(null);
    setStatus(null);
  };

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
      setChoice(null);
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

  const updateVariant = (index: number, next: WantedVariantFormValue) => {
    setVariants((current) => current.map((item, i) => (i === index ? next : item)));
  };

  const addVariantRow = () => {
    setVariants((current) =>
      current.length >= MAX_WANTED_VARIANTS ? current : [...current, EMPTY_WANTED_VARIANT],
    );
  };

  const removeVariantRow = (index: number) => {
    setVariants((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  };

  const handleAddWanted = async () => {
    setBusy(true);
    setErrorCode(null);
    setStatus(null);
    try {
      const created = await addWantedEntries({
        releaseGroupId,
        entries: variants.map((variant) => ({
          format: variant.format,
          attributes: variant.attributes,
          note: variant.note.trim() === "" ? null : variant.note.trim(),
        })),
      });
      setWantedEntries((current) => [...created, ...current]);
      setStatus(t("wantedAdded", { count: created.length }));
      setVariants([EMPTY_WANTED_VARIANT]);
      setOpen(false);
      setChoice(null);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveWanted = async (entry: WantedEntry) => {
    setBusy(true);
    setErrorCode(null);
    setStatus(null);
    try {
      await removeWantedEntry(entry.id);
      setWantedEntries((current) => current.filter((item) => item.id !== entry.id));
      setStatus(t("wantedRemoved"));
    } catch (error) {
      if (error instanceof ApiError && error.code === "WANTED_ENTRY_NOT_FOUND") {
        setWantedEntries((current) => current.filter((item) => item.id !== entry.id));
      } else {
        setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-start gap-2">
      <Button
        variant="secondary"
        onClick={() =>
          setOpen((current) => {
            const next = !current;
            if (!next) setChoice(null);
            return next;
          })
        }
      >
        {t("addToCollection")}
      </Button>

      {entries.length > 0 && (
        <div className="flex w-full flex-col gap-1.5">
          <span className="font-data text-xs text-paper-muted">{t("haveEntriesHeading")}</span>
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
                  {entry.note && <span className="mt-0.5 block text-paper-muted">{entry.note}</span>}
                </div>
                <Button variant="ghost" disabled={busy} onClick={() => void handleRemove(entry)}>
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {wantedEntries.length > 0 && (
        <div className="flex w-full flex-col gap-1.5">
          <span className="font-data text-xs text-paper-muted">{t("wantedEntriesHeading")}</span>
          <ul className="flex w-full flex-col gap-1.5">
            {wantedEntries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded border border-ink-border bg-ink-surface px-3 py-2"
              >
                <div className="min-w-0 font-data text-xs text-paper">
                  <span className="text-paper">{formatLabel(entry.format, t)}</span>
                  {entry.attributes.length > 0 && (
                    <span className="text-paper-muted">
                      {" · "}
                      {entry.attributes.map((attribute) => t(`attribute.${attribute}`)).join(" · ")}
                    </span>
                  )}
                  {entry.note && <span className="mt-0.5 block text-paper-muted">{entry.note}</span>}
                </div>
                <Button variant="ghost" disabled={busy} onClick={() => void handleRemoveWanted(entry)}>
                  {t("remove")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <div className="flex w-full flex-col gap-3 rounded border border-ink-border bg-ink-surface p-3">
          <div role="radiogroup" aria-label={t("addChoiceLabel")} className="flex gap-1.5">
            <button
              type="button"
              role="radio"
              aria-checked={choice === "have"}
              onClick={() => selectChoice("have")}
              className={`rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                choice === "have"
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-ink-border text-paper-muted hover:text-paper"
              }`}
            >
              {t("haveIt")}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={choice === "want"}
              onClick={() => selectChoice("want")}
              className={`rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                choice === "want"
                  ? "border-amber bg-amber/10 text-amber"
                  : "border-ink-border text-paper-muted hover:text-paper"
              }`}
            >
              {t("wantIt")}
            </button>
          </div>

          {choice === "have" && (
            <>
              <CollectionEntryForm value={form} onChange={setForm} disabled={busy} />
              <Button variant="primary" disabled={busy} onClick={() => void handleAdd()}>
                {busy ? t("saving") : t("confirmAdd")}
              </Button>
            </>
          )}

          {choice === "want" && (
            <>
              {variants.map((variant, index) => (
                <div key={index} className="flex flex-col gap-2 border-t border-ink-border pt-3 first:border-t-0 first:pt-0">
                  <WantedVariantForm
                    value={variant}
                    onChange={(next) => updateVariant(index, next)}
                    disabled={busy}
                  />
                  {variants.length > 1 && (
                    <Button variant="ghost" disabled={busy} onClick={() => removeVariantRow(index)}>
                      {t("removeVariant")}
                    </Button>
                  )}
                </div>
              ))}
              {variants.length < MAX_WANTED_VARIANTS && (
                <Button variant="secondary" disabled={busy} onClick={addVariantRow}>
                  {t("addVariant")}
                </Button>
              )}
              <Button variant="primary" disabled={busy} onClick={() => void handleAddWanted()}>
                {busy ? t("saving") : t("confirmAddWanted")}
              </Button>
            </>
          )}
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
