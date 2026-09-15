"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { COLLECTION_FORMATS, EDITION_ATTRIBUTES } from "@/services/collection/vocabulary";
import { COLLECTION_NOTE_MAX } from "@/lib/api/schemas";
import type { CollectionFormat, EditionAttribute } from "@/services/collection/vocabulary";
import type { WantedEntry } from "@/lib/api/schemas";

export interface WantedVariantFormValue {
  /** `null` = cualquier formato — a diferencia de `CollectionEntryFormValue.format`, opcional. */
  format: CollectionFormat | null;
  attributes: EditionAttribute[];
  note: string;
}

export const EMPTY_WANTED_VARIANT: WantedVariantFormValue = {
  format: null,
  attributes: [],
  note: "",
};

/** Valor inicial del formulario tomado de una entrada de deseo existente (edición). */
export function wantedEntryToFormValue(entry: WantedEntry): WantedVariantFormValue {
  return {
    format: entry.format,
    attributes: [...entry.attributes],
    note: entry.note ?? "",
  };
}

interface WantedVariantFormProps {
  value: WantedVariantFormValue;
  onChange: (next: WantedVariantFormValue) => void;
  disabled?: boolean;
}

function optionClasses(active: boolean): string {
  return `cursor-pointer rounded border px-2 py-1 font-data text-xs transition-colors ${
    active
      ? "border-amber bg-amber/10 text-amber"
      : "border-ink-border text-paper-muted hover:text-paper"
  }`;
}

// Formulario controlado de una variante deseada: formato opcional ("cualquier
// formato" incluido como opción explícita, a diferencia de CollectionEntryForm
// donde es obligatorio), atributos de edición (cero o más) y nota libre
// (≤140). Sin audiencia: la wishlist es privada del dueño (D4, design.md).
export function WantedVariantForm({ value, onChange, disabled }: WantedVariantFormProps) {
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
      <fieldset className="flex flex-col gap-1" disabled={disabled}>
        <legend className="font-data text-xs text-paper-muted">{t("formatLabel")}</legend>
        <div className="flex flex-wrap gap-1.5">
          <label className={optionClasses(value.format === null)}>
            <input
              type="radio"
              name={`${fieldId}-format`}
              className="sr-only"
              checked={value.format === null}
              onChange={() => onChange({ ...value, format: null })}
            />
            {t("anyFormat")}
          </label>
          {COLLECTION_FORMATS.map((format) => (
            <label key={format} className={optionClasses(value.format === format)}>
              <input
                type="radio"
                name={`${fieldId}-format`}
                className="sr-only"
                checked={value.format === format}
                onChange={() => onChange({ ...value, format })}
              />
              {t(`format.${format}`)}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1" disabled={disabled}>
        <legend className="font-data text-xs text-paper-muted">{t("attributesLabel")}</legend>
        <div className="flex flex-wrap gap-1.5">
          {EDITION_ATTRIBUTES.map((attribute) => {
            const active = value.attributes.includes(attribute);
            return (
              <label key={attribute} className={optionClasses(active)}>
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
    </div>
  );
}
