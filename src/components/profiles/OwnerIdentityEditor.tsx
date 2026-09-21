"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OwnProfileResponseSchema } from "@/lib/api/schemas";
import { TIMEZONES } from "@/lib/music-identity";
import { PROFILE_IDENTITY_LIMITS } from "@/services/social/types";
import { useNotifySaved, useReportDirty, type EditorHostCallbacks } from "./editor-host";
import { TimezonePicker } from "./TimezonePicker";

type Field = "bio" | "pronouns" | "location" | "timezone";

interface OwnerIdentityEditorProps extends EditorHostCallbacks {
  initial: Record<Field, string | null> & {
    /** Mostrar la hora local en la Placa; sin zona no tiene efecto. */
    showLocalTime?: boolean;
  };
}

// Una zona guardada que no está en la lista (dato anterior a la validación) se
// trata como "sin zona": el selector no puede mostrarla y al guardar se descarta.
const validZone = (zone: string) => (TIMEZONES.includes(zone) ? zone : "");

const FIELDS: Field[] = ["bio", "pronouns", "location", "timezone"];

// Editor inline de la identidad del dueño (bio, pronombres, ubicación, zona
// horaria y si se muestra la hora local), montado solo en la vista del propio
// perfil. Persiste vía PATCH /api/me/profile sin recargar. La zona horaria es un
// selector con buscador de identificadores IANA, no texto libre. Ver spec profile-identity.
export function OwnerIdentityEditor({ initial, onSaved, onDirtyChange }: OwnerIdentityEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);
  const [values, setValues] = useState<Record<Field, string>>({
    bio: initial.bio ?? "",
    pronouns: initial.pronouns ?? "",
    location: initial.location ?? "",
    timezone: validZone(initial.timezone ?? ""),
  });
  // Lo último persistido: arranca en `initial` y se actualiza al guardar, para
  // que tras guardar el editor deje de contar como "con cambios sin guardar".
  const [baseline, setBaseline] = useState<Record<Field, string>>({
    bio: initial.bio ?? "",
    pronouns: initial.pronouns ?? "",
    location: initial.location ?? "",
    timezone: validZone(initial.timezone ?? ""),
  });
  const [showLocalTime, setShowLocalTime] = useState(Boolean(initial.showLocalTime) && Boolean(validZone(initial.timezone ?? "")));
  const [baselineShow, setBaselineShow] = useState(showLocalTime);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const hasZone = values.timezone !== "";
  const dirty = FIELDS.some((field) => values[field].trim() !== baseline[field]) || showLocalTime !== baselineShow;
  useReportDirty(dirty, onDirtyChange);

  async function save() {
    setStatus("saving");
    setErrorCode(null);
    try {
      const trimmed = Object.fromEntries(
        FIELDS.map((field) => [field, values[field].trim()]),
      ) as Record<Field, string>;
      // Sin zona la hora local no significa nada: se apaga sola.
      const show = trimmed.timezone !== "" && showLocalTime;
      await apiFetch("/api/me/profile", OwnProfileResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trimmed, showLocalTime: show }),
      });
      setBaseline(trimmed);
      setShowLocalTime(show);
      setBaselineShow(show);
      setStatus("saved");
      notifySaved();
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

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <div className="flex flex-col gap-2">
        <TimezonePicker
          id="edit-timezone"
          label={t("edit.timezoneLabel")}
          value={values.timezone}
          onChange={(timezone) => {
            setValues((prev) => ({ ...prev, timezone }));
            // Sin zona la hora local no significa nada: la opción se apaga sola.
            if (timezone === "") setShowLocalTime(false);
            setStatus("idle");
          }}
        />
        <label
          className={`flex items-center gap-2 font-body text-sm ${hasZone ? "text-paper-muted" : "text-paper-muted/50"}`}
        >
          <input
            type="checkbox"
            checked={showLocalTime && hasZone}
            disabled={!hasZone}
            onChange={(event) => {
              setShowLocalTime(event.target.checked);
              setStatus("idle");
            }}
            className="accent-amber"
          />
          {t("edit.showLocalTime")}
        </label>
        {!hasZone && <p className="font-body text-xs text-paper-muted">{t("edit.showLocalTimeNeedsZone")}</p>}
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
