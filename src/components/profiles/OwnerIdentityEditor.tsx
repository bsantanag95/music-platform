"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OwnProfileResponseSchema } from "@/lib/api/schemas";
import { PROFILE_IDENTITY_LIMITS } from "@/services/social/types";

type Field = "bio" | "pronouns" | "location" | "timezone";

interface OwnerIdentityEditorProps {
  initial: Record<Field, string | null>;
}

const FIELDS: Field[] = ["bio", "pronouns", "location", "timezone"];

// Editor inline de la identidad del dueño (bio, pronombres, ubicación, zona
// horaria), montado solo en la vista del propio perfil. Persiste vía
// PATCH /api/me/profile sin recargar. Ver spec profile-identity.
export function OwnerIdentityEditor({ initial }: OwnerIdentityEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [values, setValues] = useState<Record<Field, string>>({
    bio: initial.bio ?? "",
    pronouns: initial.pronouns ?? "",
    location: initial.location ?? "",
    timezone: initial.timezone ?? "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const dirty = FIELDS.some((field) => values[field].trim() !== (initial[field] ?? ""));

  async function save() {
    setStatus("saving");
    setErrorCode(null);
    try {
      await apiFetch("/api/me/profile", OwnProfileResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(FIELDS.map((field) => [field, values[field].trim()])),
        ),
      });
      setStatus("saved");
    } catch (error) {
      setStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h3 className="font-display text-sm text-paper-muted">{t("edit.identityHeading")}</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="edit-bio" className="font-display text-sm text-paper-muted">
          {t("edit.bioLabel")}
        </label>
        <textarea
          id="edit-bio"
          value={values.bio}
          maxLength={PROFILE_IDENTITY_LIMITS.bio}
          placeholder={t("edit.bioPlaceholder")}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, bio: event.target.value }));
            setStatus("idle");
          }}
          className="min-h-20 resize-y rounded border border-ink-border bg-ink-surface px-3 py-2 font-body text-paper placeholder:text-paper-muted"
        />
        <p className="text-right font-data text-xs text-paper-muted">
          {values.bio.length}/{PROFILE_IDENTITY_LIMITS.bio}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label={t("edit.pronounsLabel")}
          value={values.pronouns}
          maxLength={PROFILE_IDENTITY_LIMITS.pronouns}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, pronouns: event.target.value }));
            setStatus("idle");
          }}
        />
        <Input
          label={t("edit.locationLabel")}
          value={values.location}
          maxLength={PROFILE_IDENTITY_LIMITS.location}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, location: event.target.value }));
            setStatus("idle");
          }}
        />
        <Input
          label={t("edit.timezoneLabel")}
          value={values.timezone}
          maxLength={PROFILE_IDENTITY_LIMITS.timezone}
          onChange={(event) => {
            setValues((prev) => ({ ...prev, timezone: event.target.value }));
            setStatus("idle");
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "saving" || !dirty}>
          {status === "saving" ? t("edit.saving") : t("edit.save")}
        </Button>
        {status === "saved" && (
          <span role="status" className="font-data text-xs text-petrol-hover">
            {t("edit.saved")}
          </span>
        )}
        {errorCode && (
          <span role="alert" className="font-data text-xs text-danger">
            {tErrors(`${errorCode}.description`)}
          </span>
        )}
      </div>
    </form>
  );
}
