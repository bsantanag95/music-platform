"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createList } from "@/lib/api/lists";
import { ApiError } from "@/lib/api/client";
import type { DiaryAudience, ListEntityType, UserListDetail } from "@/lib/api/schemas";

interface ListFormProps {
  onCreated?: (list: UserListDetail) => void;
  onCancel?: () => void;
}

// Formulario de creación de lista: título obligatorio, descripción opcional,
// tipo de entidad fijo (artistas, álbumes o canciones) y audiencia.
export function ListForm({ onCreated, onCancel }: ListFormProps) {
  const t = useTranslations("lists");
  const [entityType, setEntityType] = useState<ListEntityType>("artist");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<DiaryAudience>("followers");
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const list = await createList({
        entityType,
        title,
        description: description.trim() === "" ? null : description,
        audience,
      });
      onCreated?.(list);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4">
      <label className="flex flex-col gap-1">
        <span className="font-data text-sm text-paper">{t("entityTypeLabel")}</span>
        <select
          value={entityType}
          onChange={(event) => setEntityType(event.target.value as ListEntityType)}
          className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper"
        >
          <option value="artist">{t("entityTypeArtist")}</option>
          <option value="release-group">{t("entityTypeAlbum")}</option>
          <option value="recording">{t("entityTypeSong")}</option>
        </select>
      </label>

      <Input
        label={t("titleLabel")}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={100}
        placeholder={t("titlePlaceholder")}
      />

      <label className="flex flex-col gap-1">
        <span className="font-data text-sm text-paper">{t("descriptionLabel")}</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={500}
          rows={3}
          className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper"
        />
      </label>

      <fieldset>
        <legend className="font-data text-sm text-paper">{t("audienceLabel")}</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {(["private", "followers", "public"] as const).map((option) => (
            <label
              key={option}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                audience === option
                  ? "border-amber bg-amber/10 text-paper"
                  : "border-ink-border bg-ink text-paper-muted hover:text-paper"
              }`}
            >
              <input
                type="radio"
                name="list-audience"
                className="sr-only"
                checked={audience === option}
                onChange={() => setAudience(option)}
              />
              {t(`audience.${option}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-2">
        <Button variant="primary" disabled={busy || title.trim() === ""} onClick={() => void handleSubmit()}>
          {busy ? t("saving") : t("createList")}
        </Button>
        {onCancel ? (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {t("collapse")}
          </Button>
        ) : null}
        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {t("saveError")}
          </span>
        )}
      </div>
    </div>
  );
}