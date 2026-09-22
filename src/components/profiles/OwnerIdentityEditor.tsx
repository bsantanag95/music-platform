"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch, ApiError } from "@/lib/api/client";
import { OwnProfileResponseSchema } from "@/lib/api/schemas";
import { TIMEZONES } from "@/lib/music-identity";
import { isPronounSet, isValidCountry, PRONOUN_SETS, type PronounSet } from "@/lib/personal-info";
import { PROFILE_IDENTITY_LIMITS } from "@/services/social/types";
import { CountryPicker } from "./CountryPicker";
import { useNotifySaved, useReportDirty, type EditorHostCallbacks } from "./editor-host";
import { TimezonePicker } from "./TimezonePicker";

type Field = "bio" | "location" | "timezone" | "country";

// Estado de los pronombres en el editor (spec profile-personal-info, "Pronombres"):
// ninguno, una clave de la lista o «Otro» con su texto libre.
type PronounChoice = "none" | PronounSet | "other";

interface OwnerIdentityEditorProps extends EditorHostCallbacks {
  initial: {
    bio: string | null;
    /** Texto libre de «Otro». */
    pronouns: string | null;
    /** Clave de la lista de pronombres. */
    pronounSet?: string | null;
    /** Código ISO del país. */
    country?: string | null;
    /** Ciudad o región. */
    location: string | null;
    timezone: string | null;
    /** Mostrar la hora local en la Placa; sin zona no tiene efecto. */
    showLocalTime?: boolean;
  };
  /** Nombre visible de la persona, para la frase de ejemplo de los pronombres. */
  name?: string;
}

// Una zona guardada que no está en la lista (dato anterior a la validación) se
// trata como "sin zona": el selector no puede mostrarla y al guardar se descarta.
const validZone = (zone: string) => (TIMEZONES.includes(zone) ? zone : "");

const FIELDS: Field[] = ["bio", "location", "timezone", "country"];
const PRONOUN_CHOICES: PronounChoice[] = ["none", ...PRONOUN_SETS, "other"];

// Un país guardado que ya no esté en la lista se trata como "sin país".
const validCountry = (code: string) => (isValidCountry(code) ? code : "");

// Estado inicial de los pronombres: la clave de la lista manda; sin ella, un texto libre
// (incluido uno anterior a la lista) es «Otro»; sin ninguno, «Sin especificar».
function initialPronouns(initial: OwnerIdentityEditorProps["initial"]): { choice: PronounChoice; other: string } {
  if (isPronounSet(initial.pronounSet)) return { choice: initial.pronounSet, other: "" };
  const text = (initial.pronouns ?? "").trim();
  return text !== "" ? { choice: "other", other: text } : { choice: "none", other: "" };
}

// Editor inline de la identidad del dueño (bio, pronombres, país, ciudad o región,
// zona horaria y si se muestra la hora local), montado solo en la vista del propio
// perfil. Persiste vía PATCH /api/me/profile sin recargar. La zona horaria y el país
// son selectores con buscador de listas cerradas, no texto libre; los pronombres, una
// lista con «Otro» y un ejemplo en vivo. Ver specs profile-identity y profile-personal-info.
export function OwnerIdentityEditor({ initial, name, onSaved, onDirtyChange }: OwnerIdentityEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);
  const startValues = (): Record<Field, string> => ({
    bio: initial.bio ?? "",
    location: initial.location ?? "",
    timezone: validZone(initial.timezone ?? ""),
    country: validCountry(initial.country ?? ""),
  });
  const [values, setValues] = useState<Record<Field, string>>(startValues);
  const [pronounChoice, setPronounChoice] = useState<PronounChoice>(() => initialPronouns(initial).choice);
  const [pronounOther, setPronounOther] = useState(() => initialPronouns(initial).other);
  // Lo último persistido: arranca en `initial` y se actualiza al guardar, para
  // que tras guardar el editor deje de contar como "con cambios sin guardar".
  const [baseline, setBaseline] = useState<Record<Field, string>>(startValues);
  const [baselinePronouns, setBaselinePronouns] = useState(() => initialPronouns(initial));
  const [showLocalTime, setShowLocalTime] = useState(Boolean(initial.showLocalTime) && Boolean(validZone(initial.timezone ?? "")));
  const [baselineShow, setBaselineShow] = useState(showLocalTime);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const hasZone = values.timezone !== "";
  const otherText = pronounOther.trim();
  const pronounsDirty =
    pronounChoice !== baselinePronouns.choice || (pronounChoice === "other" && otherText !== baselinePronouns.other);
  const dirty =
    FIELDS.some((field) => values[field].trim() !== baseline[field]) || pronounsDirty || showLocalTime !== baselineShow;
  // «Otro» sin texto no se puede guardar: el editor lo dice en vez de enviar algo inválido.
  const otherMissing = pronounChoice === "other" && otherText === "";
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
      // Tres estados de pronombres: ninguno borra ambos, una clave de la lista borra el
      // texto libre y «Otro» envía el texto.
      const pronounBody =
        pronounChoice === "none"
          ? { pronounSet: null, pronouns: null }
          : pronounChoice === "other"
            ? { pronounSet: "other", pronouns: otherText }
            : { pronounSet: pronounChoice, pronouns: null };
      await apiFetch("/api/me/profile", OwnProfileResponseSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trimmed, ...pronounBody, showLocalTime: show }),
      });
      setBaseline(trimmed);
      setBaselinePronouns({ choice: pronounChoice, other: pronounChoice === "other" ? otherText : "" });
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

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="edit-pronouns" className="font-display text-sm text-paper-muted">
            {t("edit.pronounsLabel")}
          </label>
          <select
            id="edit-pronouns"
            value={pronounChoice}
            onChange={(event) => {
              setPronounChoice(event.target.value as PronounChoice);
              setStatus("idle");
            }}
            className="rounded border border-ink-border bg-ink-surface px-3 py-2 font-body text-paper"
          >
            {PRONOUN_CHOICES.map((choice) => (
              <option key={choice} value={choice}>
                {t(`edit.pronounOption.${choice}`)}
              </option>
            ))}
          </select>
        </div>
        {pronounChoice === "other" && (
          <Input
            label={t("edit.pronounOtherLabel")}
            value={pronounOther}
            maxLength={PROFILE_IDENTITY_LIMITS.pronouns}
            error={otherMissing ? t("edit.pronounOtherRequired") : undefined}
            onChange={(event) => {
              setPronounOther(event.target.value);
              setStatus("idle");
            }}
          />
        )}
        <PronounExample choice={pronounChoice} name={name ?? t("edit.pronounExampleName")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CountryPicker
          id="edit-country"
          label={t("edit.countryLabel")}
          value={values.country}
          onChange={(country) => {
            setValues((prev) => ({ ...prev, country }));
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
      <p className="-mt-2 font-body text-xs text-paper-muted">{t("edit.personalVisibilityHint")}</p>

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
        <Button type="submit" disabled={status === "saving" || !dirty || otherMissing}>
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

// Frase de ejemplo rotulada, en vivo con la opción elegida (spec profile-personal-info,
// "Ejemplo de los pronombres en el editor"). Es una ILUSTRACIÓN: el posesivo en inglés y
// el sujeto en español cambian con la opción; sin lista (o con «Otro») usa la forma neutra.
// La interfaz no conjuga con los pronombres: solo se muestran en el perfil.
function PronounExample({ choice, name }: { choice: PronounChoice; name: string }) {
  const t = useTranslations("users");
  const key = isPronounSet(choice) ? choice : "neutral";
  return (
    <div aria-live="polite" className="rounded border border-dashed border-ink-border px-3 py-2 font-body text-sm text-paper-muted">
      <span className="mb-1 block font-data text-[11px] uppercase tracking-wide">{t("edit.pronounExampleLabel")}</span>
      <span>{t(`edit.pronounExample.${key}`, { name })}</span>
      {key === "neutral" && <span className="mt-1 block text-xs">{t("edit.pronounExampleNeutralNote")}</span>}
    </div>
  );
}
