"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { COLLECTION_FORMATS, EDITION_ATTRIBUTES } from "@/services/collection/vocabulary";
import { COLLECTION_NOTE_MAX } from "@/lib/api/schemas";
import type { CollectionFormat, EditionAttribute } from "@/services/collection/vocabulary";
import type { DiaryAudience } from "@/lib/api/schemas";

const AUDIENCES: DiaryAudience[] = ["private", "followers", "public"];

export interface CollectionEntryFormValue {
  format: CollectionFormat;
  attributes: EditionAttribute[];
  note: string;
  audience: DiaryAudience;
}

export const EMPTY_ENTRY_FORM: CollectionEntryFormValue = {
  format: "vinyl",
  attributes: [],
  note: "",
  audience: "followers",
};

interface CollectionEntryFormProps {
  value: CollectionEntryFormValue;
  onChange: (next: CollectionEntryFormValue) => void;
  /** Muestra los controles de audiencia (edición); el alta usa el default. */
  showAudience?: boolean;
  disabled?: boolean;
}

// Formulario controlado de una copia física: formato (obligatorio), atributos de
// edición (cero o más, vocabulario cerrado) y nota libre (≤140). Compartido por
// la acción de alta en la página de álbum y por el panel de edición en línea de
// `/me/collection`.
export function CollectionEntryForm({
  value,
  onChange,
  showAudience,
  disabled,
}: CollectionEntryFormProps) {
  const t = useTranslations("collection");
  const fieldId = useId();

  const toggleAttribute = (attribute: EditionAttribute) => {
    const next = value.attributes.includes(attribute)
      ? value.attributes.filter((item) => item !== attribute)
      : [...value.attributes, attribute];
    onChange({ ...value, attributes: next });
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
        {t("formatLabel")}
        <select
          value={value.format}
          disabled={disabled}
          onChange={(event) =>
            onChange({ ...value, format: event.target.value as CollectionFormat })
          }
          className="rounded border border-ink-border bg-ink px-2 py-1.5 font-data text-sm text-paper disabled:opacity-50"
        >
          {COLLECTION_FORMATS.map((format) => (
            <option key={format} value={format}>
              {t(`format.${format}`)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-1" disabled={disabled}>
        <legend className="font-data text-xs text-paper-muted">{t("attributesLabel")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {EDITION_ATTRIBUTES.map((attribute) => {
            const active = value.attributes.includes(attribute);
            return (
              <label
                key={attribute}
                className={`cursor-pointer rounded border px-2 py-1 font-data text-xs transition-colors ${
                  active
                    ? "border-amber bg-amber/10 text-amber"
                    : "border-ink-border text-paper-muted hover:text-paper"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={active}
                  onChange={() => toggleAttribute(attribute)}
                />
                {t(`attribute.${attribute}`)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label
        className="flex flex-col gap-1 font-data text-xs text-paper-muted"
        htmlFor={`${fieldId}-note`}
      >
        {t("noteLabel")}
        <input
          id={`${fieldId}-note`}
          type="text"
          value={value.note}
          maxLength={COLLECTION_NOTE_MAX}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, note: event.target.value })}
          placeholder={t("notePlaceholder")}
          className="rounded border border-ink-border bg-ink px-2 py-1.5 font-data text-sm text-paper disabled:opacity-50"
        />
      </label>

      {showAudience ? (
        <fieldset className="flex flex-col gap-1" disabled={disabled}>
          <legend className="font-data text-xs text-paper-muted">{t("audienceLabel")}</legend>
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCES.map((audience) => {
              const active = value.audience === audience;
              return (
                <label
                  key={audience}
                  className={`cursor-pointer rounded border px-2 py-1 font-data text-xs transition-colors ${
                    active
                      ? "border-amber bg-amber/10 text-amber"
                      : "border-ink-border text-paper-muted hover:text-paper"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${fieldId}-audience`}
                    className="sr-only"
                    checked={active}
                    onChange={() => onChange({ ...value, audience })}
                  />
                  {t(`audience.${audience}`)}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
