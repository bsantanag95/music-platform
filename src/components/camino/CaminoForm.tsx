"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCamino } from "@/lib/api/camino";
import { ApiError } from "@/lib/api/client";
import type { CaminoDetail, DiaryAudience } from "@/lib/api/schemas";

interface CaminoFormProps {
  onCreated?: (camino: CaminoDetail) => void;
  onCancel?: () => void;
}

// Compositor de creación de Camino: título obligatorio, descripción opcional,
// audiencia — mismo patrón que `ListForm`, sin selector de tipo de entidad
// (un Camino es siempre de álbumes).
export function CaminoForm({ onCreated, onCancel }: CaminoFormProps) {
  const t = useTranslations("camino");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<DiaryAudience>("followers");
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleSubmit = async () => {
    setBusy(true);
    setErrorCode(null);
    try {
      const camino = await createCamino({
        title,
        description: description.trim() === "" ? null : description,
        audience,
      });
      onCreated?.(camino);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4">
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
                name="camino-audience"
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
          {busy ? t("saving") : t("createCamino")}
        </Button>
        {onCancel ? (
          <Button variant="ghost" disabled={busy} onClick={onCancel}>
            {t("cancel")}
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
