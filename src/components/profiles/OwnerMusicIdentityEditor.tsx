"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api/client";
import { MusicIdentityResponseSchema } from "@/lib/api/schemas";
import {
  GENRES,
  LISTENING_FORMATS,
  MUSIC_IDENTITY_LIMITS,
  SELF_ROLES,
  type Genre,
  type ListeningFormat,
  type SelfRole,
} from "@/lib/music-identity";
import { useNotifySaved, useReportDirty, type EditorHostCallbacks } from "./editor-host";

interface MusicIdentityValues {
  selfRoles: SelfRole[];
  genres: Genre[];
  listeningFormats: ListeningFormat[];
}

interface OwnerMusicIdentityEditorProps extends EditorHostCallbacks {
  initial: MusicIdentityValues;
}

interface ChipGroupProps<T extends string> {
  title: string;
  hint: string;
  options: readonly T[];
  selected: T[];
  max: number;
  optionLabel: (option: T) => string;
  counterLabel: string;
  onChange: (next: T[]) => void;
}

// Un grupo de chips de una lista CERRADA con tope: elegir uno más allá del máximo
// no se puede hasta quitar otro. Los elegidos conservan el orden en que se eligen
// (es el orden en que se muestran en la ficha).
function ChipGroup<T extends string>({
  title,
  hint,
  options,
  selected,
  max,
  optionLabel,
  counterLabel,
  onChange,
}: ChipGroupProps<T>) {
  const full = selected.length >= max;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="flex w-full items-baseline justify-between gap-3 font-display text-sm text-paper-muted">
        <span>{title}</span>
        <span className="font-data text-xs">{counterLabel}</span>
      </legend>
      <p className="font-body text-xs text-paper-muted">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const pressed = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={pressed}
              disabled={!pressed && full}
              onClick={() => onChange(pressed ? selected.filter((item) => item !== option) : [...selected, option])}
              className={`rounded-full border px-3 py-1 font-display text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                pressed
                  ? "border-amber bg-amber/10 text-paper"
                  : "border-ink-border text-paper-muted hover:border-amber hover:text-paper"
              }`}
            >
              {optionLabel(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((item, i) => item === b[i]);

// Editor de la identidad musical del dueño (spec profile-music-identity): "Me
// defino como" (hasta 3), géneros (hasta 5) y "Cómo escucho" (formatos), todos de
// listas cerradas. Persiste con PUT /api/me/profile/music-identity; montado en la
// pantalla Perfil de Ajustes y en el panel lateral del modo edición.
export function OwnerMusicIdentityEditor({ initial, onSaved, onDirtyChange }: OwnerMusicIdentityEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);
  const [values, setValues] = useState<MusicIdentityValues>(initial);
  // Lo último persistido: arranca en `initial` y se actualiza al guardar.
  const [baseline, setBaseline] = useState<MusicIdentityValues>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const dirty =
    !sameList(values.selfRoles, baseline.selfRoles) ||
    !sameList(values.genres, baseline.genres) ||
    !sameList(values.listeningFormats, baseline.listeningFormats);
  useReportDirty(dirty, onDirtyChange);

  function change<K extends keyof MusicIdentityValues>(key: K, next: MusicIdentityValues[K]) {
    setValues((prev) => ({ ...prev, [key]: next }));
    setStatus("idle");
  }

  async function save() {
    setStatus("saving");
    setErrorCode(null);
    try {
      const saved = await apiFetch("/api/me/profile/music-identity", MusicIdentityResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setBaseline(saved);
      setValues(saved);
      setStatus("saved");
      notifySaved();
    } catch (error) {
      setStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  const counter = (count: number, max: number) => t("musicIdentity.editor.counter", { count, max });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <ChipGroup
        title={t("musicIdentity.editor.rolesTitle")}
        hint={t("musicIdentity.editor.rolesHint", { max: MUSIC_IDENTITY_LIMITS.selfRoles })}
        options={SELF_ROLES}
        selected={values.selfRoles}
        max={MUSIC_IDENTITY_LIMITS.selfRoles}
        optionLabel={(option) => t(`musicIdentity.roles.${option}`)}
        counterLabel={counter(values.selfRoles.length, MUSIC_IDENTITY_LIMITS.selfRoles)}
        onChange={(next) => change("selfRoles", next)}
      />
      <ChipGroup
        title={t("musicIdentity.editor.genresTitle")}
        hint={t("musicIdentity.editor.genresHint", { max: MUSIC_IDENTITY_LIMITS.genres })}
        options={GENRES}
        selected={values.genres}
        max={MUSIC_IDENTITY_LIMITS.genres}
        optionLabel={(option) => t(`musicIdentity.genres.${option}`)}
        counterLabel={counter(values.genres.length, MUSIC_IDENTITY_LIMITS.genres)}
        onChange={(next) => change("genres", next)}
      />
      <ChipGroup
        title={t("musicIdentity.editor.formatsTitle")}
        hint={t("musicIdentity.editor.formatsHint")}
        options={LISTENING_FORMATS}
        selected={values.listeningFormats}
        max={MUSIC_IDENTITY_LIMITS.listeningFormats}
        optionLabel={(option) => t(`musicIdentity.formats.${option}`)}
        counterLabel={counter(values.listeningFormats.length, MUSIC_IDENTITY_LIMITS.listeningFormats)}
        onChange={(next) => change("listeningFormats", next)}
      />

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
