"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OwnProfileResponseSchema, type DefaultAudience } from "@/lib/api/schemas";

interface DefaultAudienceSettingsProps {
  /** Preferencia actual; `null` = "según el tipo". */
  initialAudience: DefaultAudience | null;
}

type Choice = DefaultAudience | "auto";

const CHOICES: readonly Choice[] = ["auto", "private", "followers", "public"];

// Audiencia por defecto del contenido nuevo (spec default-audience, "Control de
// audiencia por defecto en Ajustes"). Cuatro opciones: "Según el tipo" (sin
// valor, `null`) y las tres audiencias. Persiste al elegir vía PATCH
// /api/me/profile. Solo afecta al contenido que se cree después: el texto del
// propio control lo aclara, porque no reescribe nada de lo existente.
export function DefaultAudienceSettings({ initialAudience }: DefaultAudienceSettingsProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [choice, setChoice] = useState<Choice>(initialAudience ?? "auto");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function select(next: Choice) {
    if (next === choice || saving) return;
    setSaving(true);
    setSaved(false);
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile", OwnProfileResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAudience: next === "auto" ? null : next }),
      });
      setChoice(data.user.defaultAudience ?? "auto");
      setSaved(true);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-sm text-paper-muted">{t("settings.privacy.audience.title")}</legend>
        <p className="font-body text-xs text-paper-muted">{t("settings.privacy.audience.intro")}</p>
        <p className="border-l-2 border-ink-border pl-3 font-body text-xs text-paper-muted">
          {t("settings.privacy.audience.excluded")}
        </p>
        {CHOICES.map((value) => (
          <label
            key={value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
              choice === value ? "border-amber bg-ink-surface" : "border-ink-border bg-ink-surface"
            }`}
          >
            <input
              type="radio"
              name="defaultAudience"
              value={value}
              checked={choice === value}
              disabled={saving}
              onChange={() => void select(value)}
              className="mt-1 accent-amber"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-sm text-paper">
                {t(`settings.privacy.audience.options.${value}.title`)}
              </span>
              <span className="font-body text-xs text-paper-muted">
                {t(`settings.privacy.audience.options.${value}.description`)}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      {saving && (
        <p className="text-sm text-paper-muted" role="status">
          {t("savingPrivacy")}
        </p>
      )}
      {saved && !saving && (
        <p className="font-data text-xs text-petrol-hover" role="status">
          {t("edit.saved")}
        </p>
      )}
      {errorCode && (
        <p className="text-sm text-danger" role="alert">
          {tErrors(`${errorCode}.description`)}
        </p>
      )}
    </div>
  );
}
