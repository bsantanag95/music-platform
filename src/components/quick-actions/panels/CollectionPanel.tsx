"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addCollectionEntry, removeCollectionEntry } from "@/lib/api/collection";
import { ApiError } from "@/lib/api/client";
import type { CollectionEntry, CollectionFormatValue } from "@/lib/api/schemas";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";
import { ActionNotice } from "../ActionNotice";
import { PanelFooter, PanelAction } from "../PanelActions";

const FORMATS: readonly CollectionFormatValue[] = ["vinyl", "cd", "cassette", "other"];

interface CollectionPanelProps {
  target: PickTarget;
  onReset: () => void;
}

// Acción Colección del diálogo de acciones rápidas (openspec: add-quick-actions-collection-camino,
// D1): tras elegir el álbum, tocar un formato agrega una copia al instante con la audiencia por
// defecto del servidor. Tener varias copias de un álbum es válido, así que no hay lectura previa;
// "Deshacer" quita justo esa copia. Atributos y nota se editan en la página de colección.
export function CollectionPanel({ target, onReset }: CollectionPanelProps) {
  const t = useTranslations("quickActions");
  const tCollection = useTranslations("collection");
  const [busy, setBusy] = useState(false);
  const [entry, setEntry] = useState<CollectionEntry | null>(null);
  const [removed, setRemoved] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const notifyChanged = useNotifyQuickActionChange();

  async function add(format: CollectionFormatValue) {
    setBusy(true);
    setErrorCode(null);
    try {
      setEntry(await addCollectionEntry({ releaseGroupId: target.id, format }));
      notifyChanged();
      setRemoved(false);
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!entry) return;
    setBusy(true);
    setErrorCode(null);
    try {
      await removeCollectionEntry(entry.id);
      notifyChanged();
      setRemoved(true);
      setEntry(null);
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="truncate font-display text-sm text-paper">{target.title}</p>

      {entry ? (
        <ActionNotice
          key="added"
          tone="success"
          title={t("collection.added")}
          detail={`${tCollection(`format.${entry.format}`)} · ${target.title}`}
        />
      ) : removed ? (
        <ActionNotice key="removed" tone="removed" title={t("collection.removed")} detail={target.title} />
      ) : null}

      {!entry ? (
        <div role="group" aria-label={t("collection.formatPrompt")} className="flex flex-col gap-1.5">
          <span className="font-data text-xs text-paper-muted">{t("collection.formatPrompt")}</span>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                disabled={busy}
                onClick={() => void add(format)}
                className="rounded-full border border-ink-border px-3 py-1 font-data text-xs text-paper transition-colors hover:border-amber disabled:opacity-50"
              >
                {tCollection(`format.${format}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {errorCode === "AUTH_REQUIRED" ? (
        <Link href="/auth/login" className="font-data text-sm text-amber underline">
          {t("signIn")}
        </Link>
      ) : errorCode ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}

      <PanelFooter>
        {entry ? (
          <PanelAction disabled={busy} onClick={() => void undo()}>
            {t("mark.undo")}
          </PanelAction>
        ) : null}
        <PanelAction onClick={onReset}>
          {t("chooseAnother")}
        </PanelAction>
      </PanelFooter>
    </div>
  );
}
