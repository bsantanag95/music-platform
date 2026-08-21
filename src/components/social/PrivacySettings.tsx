"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  OwnProfileResponseSchema,
  type ProfileVisibility,
} from "@/lib/api/schemas";

interface PrivacySettingsProps {
  initialVisibility: ProfileVisibility;
}

// Selector de visibilidad del perfil (público/privado). Es un Client Component
// porque persiste el cambio vía PATCH y actualiza el estado local.
export function PrivacySettings({ initialVisibility }: PrivacySettingsProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [visibility, setVisibility] = useState<ProfileVisibility>(initialVisibility);
  const [saving, setSaving] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function select(next: ProfileVisibility) {
    if (next === visibility || saving) return;
    setSaving(true);
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile", OwnProfileResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileVisibility: next }),
      });
      setVisibility(data.user.profileVisibility);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setSaving(false);
    }
  }

  const options: { value: ProfileVisibility; title: string; description: string }[] = [
    { value: "public", title: t("profilePublicLabel"), description: t("profilePublicDescription") },
    { value: "private", title: t("profilePrivateLabel"), description: t("profilePrivateDescription") },
  ];

  return (
    <div className="flex w-full max-w-xl flex-col gap-4">
      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-sm text-paper-muted">{t("profileVisibilityLabel")}</legend>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
              visibility === option.value ? "border-amber bg-ink-surface" : "border-ink-border bg-ink-surface"
            }`}
          >
            <input
              type="radio"
              name="profileVisibility"
              value={option.value}
              checked={visibility === option.value}
              disabled={saving}
              onChange={() => select(option.value)}
              className="mt-1 accent-amber"
            />
            <span className="flex flex-col gap-1">
              <span className="font-display text-sm text-paper">{option.title}</span>
              <span className="font-body text-xs text-paper-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {saving && (
        <p className="text-sm text-paper-muted" role="status">
          {t("savingPrivacy")}
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