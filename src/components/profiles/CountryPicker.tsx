"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { countryOptions } from "@/lib/personal-info";
import { normalizeSearch, SearchablePicker, type PickerOption } from "./SearchablePicker";

interface CountryPickerProps {
  id: string;
  label: string;
  /** Código del país elegido; cadena vacía = sin país. */
  value: string;
  onChange: (code: string) => void;
}

// Selector de país con buscador (spec profile-personal-info, "País del perfil"): la
// lista cerrada de países con su nombre en el idioma de la interfaz, ordenados en él.
// Se busca por el nombre, sin distinguir mayúsculas ni tildes ("mexico" encuentra
// México). Envoltorio fino de `SearchablePicker`, el mismo combobox que la zona horaria.
export function CountryPicker({ id, label, value, onChange }: CountryPickerProps) {
  const t = useTranslations("users");
  const locale = useLocale();

  const options: PickerOption[] = useMemo(
    () =>
      countryOptions(locale).map(({ code, name }) => ({
        value: code,
        label: name,
        haystack: normalizeSearch(name),
      })),
    [locale],
  );
  const texts = useMemo(
    () => ({
      none: t("edit.countryNone"),
      searchPlaceholder: t("edit.countrySearch"),
      noResults: (query: string) => t("edit.countryNoResults", { query }),
      results: (count: number) => t("edit.countryResults", { count }),
    }),
    [t],
  );

  return <SearchablePicker id={id} label={label} value={value} onChange={onChange} options={options} texts={texts} />;
}
