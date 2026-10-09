"use client";

import { useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createList } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type { ListEntityType, UserListDetail } from "@/lib/api/schemas";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import { ActionNotice } from "../ActionNotice";

const LIST_TYPES: readonly ListEntityType[] = ["release-group", "artist", "recording"];

interface NewListPanelProps {
  /** Pasa al chip "A lista" con la búsqueda fijada al tipo de la lista recién creada. */
  onAddItems: (entityType: ListEntityType) => void;
  onNavigate: () => void;
}

// Acción Nueva lista del diálogo de acciones rápidas (openspec: add-header-quick-actions, D8):
// solo título y tipo. Crea la lista SIN `audience`, de modo que el servidor aplique la audiencia
// por defecto de la persona (`ListForm` no sirve: fija "followers" y lo envía siempre). Al crearla
// ofrece agregar ítems, porque el detalle de una lista no tiene buscador de catálogo propio.
export function NewListPanel({ onAddItems, onNavigate }: NewListPanelProps) {
  const t = useTranslations("quickActions");
  const [entityType, setEntityType] = useState<ListEntityType>("release-group");
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [created, setCreated] = useState<UserListDetail | null>(null);
  const notifyChanged = useNotifyQuickActionChange();

  const typeLabel = (type: ListEntityType) =>
    type === "artist" ? t("newList.typeArtist") : type === "release-group" ? t("newList.typeAlbum") : t("newList.typeSong");

  const submit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (title.trim() === "") {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setBusy(true);
    setErrorCode(null);
    try {
      setCreated(await createList({ entityType, title: title.trim() }));
      notifyChanged();
    } catch (err) {
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <div className="flex flex-col gap-3">
        <ActionNotice tone="success" title={t("newList.created")} detail={created.title} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => onAddItems(created.entityType)}>
            {t("newList.addItems")}
          </Button>
          <Link
            href={`/me/lists/${created.id}`}
            onClick={onNavigate}
            className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
          >
            {t("newList.viewList")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Input
        label={t("newList.titleLabel")}
        value={title}
        maxLength={100}
        onChange={(e) => setTitle(e.target.value)}
        error={titleError ? t("newList.titleRequired") : undefined}
        autoFocus
        autoComplete="off"
      />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="font-display text-sm text-paper-muted">{t("newList.typeLabel")}</legend>
        <div role="radiogroup" aria-label={t("newList.typeLabel")} className="flex flex-wrap gap-1.5">
          {LIST_TYPES.map((type) => {
            const checked = type === entityType;
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setEntityType(type)}
                className={`rounded-full border px-2.5 py-1 font-data text-xs transition-colors ${
                  checked ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
                }`}
              >
                {typeLabel(type)}
              </button>
            );
          })}
        </div>
      </fieldset>
      {errorCode === "AUTH_REQUIRED" ? (
        <Link href="/auth/login" className="font-data text-sm text-amber underline">
          {t("signIn")}
        </Link>
      ) : errorCode ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? t("newList.creating") : t("newList.submit")}
        </Button>
      </div>
    </form>
  );
}
