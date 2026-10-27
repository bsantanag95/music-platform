"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updateList } from "@/lib/api/lists";
import type { DiaryAudience, UserListDetail } from "@/lib/api/schemas";
import { entityTypeKey } from "./lists-shared";

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

interface ListMetaFormProps {
  list: Pick<UserListDetail, "id" | "title" | "description" | "audience" | "entityType">;
  onSaved: (list: UserListDetail) => void;
  onCancel: () => void;
  /** Sin caja propia: dentro de un diálogo, que ya enmarca el formulario. */
  bare?: boolean;
}

// Título, descripción y audiencia de una lista propia (el tipo no cambia). Lo comparten el detalle, en línea, y el menú
// de la tarjeta de Mis listas, en un diálogo (openspec: redesign-me-lists-views, D4).
export function ListMetaForm({ list, onSaved, onCancel, bare = false }: ListMetaFormProps) {
  const t = useTranslations("lists");
  const [title, setTitle] = useState(list.title);
  const [description, setDescription] = useState(list.description ?? "");
  const [audience, setAudience] = useState<DiaryAudience>(list.audience);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(false);
    try {
      onSaved(
        await updateList(list.id, {
          title,
          description: description.trim() === "" ? null : description,
          audience,
        }),
      );
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${bare ? "" : "rounded-lg border border-ink-border bg-ink-surface p-4"}`}>
      <Input label={t("titleLabel")} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
      <label className="flex flex-col gap-1">
        <span className="font-data text-sm text-paper">{t("descriptionLabel")}</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
        />
      </label>
      <fieldset>
        <legend className="font-data text-sm text-paper">{t("audienceLabel")}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {AUDIENCES.map((option) => (
            <label
              key={option}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 font-data text-xs transition-colors [@media(pointer:coarse)]:min-h-11 ${
                audience === option
                  ? "border-amber bg-amber/10 text-paper"
                  : "border-ink-border bg-ink text-paper-muted hover:text-paper"
              }`}
            >
              <input
                type="radio"
                name={`list-audience-${list.id}`}
                className="sr-only"
                checked={audience === option}
                onChange={() => setAudience(option)}
              />
              {t(`audience.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded border border-ink-border bg-ink px-2 py-1 font-data text-xs text-paper-muted">
          {t(entityTypeKey(list.entityType))}
        </span>
        <Button variant="primary" disabled={busy || title.trim() === ""} onClick={() => void save()}>
          {busy ? t("saving") : t("save")}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onCancel}>
          {t("collapse")}
        </Button>
      </div>
      {error ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
    </div>
  );
}
