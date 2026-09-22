"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { TIMEZONES } from "@/lib/music-identity";
import { filterPickerOptions, normalizeSearch, SearchablePicker, type PickerOption } from "./SearchablePicker";

interface TimezonePickerProps {
  id: string;
  label: string;
  /** Zona elegida; cadena vacía = sin zona. */
  value: string;
  onChange: (zone: string) => void;
}

const regionOf = (zone: string) => (zone.includes("/") ? zone.slice(0, zone.indexOf("/")) : zone);
const cityOf = (zone: string) => zone.slice(zone.lastIndexOf("/") + 1);

// Todas las zonas con su texto de búsqueda precalculado (se hace una sola vez). La
// región agrupa la lista y las zonas cuya CIUDAD empieza por lo escrito van primero.
const OPTIONS: PickerOption[] = TIMEZONES.map((zone) => ({
  value: zone,
  label: zone,
  haystack: normalizeSearch(zone),
  rankText: normalizeSearch(cityOf(zone)),
  group: regionOf(zone),
}));

/**
 * Zonas que coinciden con la búsqueda: cada palabra escrita tiene que aparecer en
 * el nombre. Las que EMPIEZAN por la búsqueda en la ciudad van primero ("par"
 * pone Paris antes que las que solo lo contienen); el resto conserva el orden
 * alfabético.
 */
export function filterTimezones(query: string): string[] {
  return filterPickerOptions(OPTIONS, query).map((option) => option.value);
}

// Selector de zona horaria con buscador (spec profile-identity: la zona se elige de
// una lista, y la lista tiene ~400 zonas). Envoltorio fino de `SearchablePicker`, que
// aporta el combobox ARIA, el filtrado y el teclado (los mismos que el selector de país).
export function TimezonePicker({ id, label, value, onChange }: TimezonePickerProps) {
  const t = useTranslations("users");
  const texts = useMemo(
    () => ({
      none: t("edit.timezoneNone"),
      searchPlaceholder: t("edit.timezoneSearch"),
      noResults: (query: string) => t("edit.timezoneNoResults", { query }),
      results: (count: number) => t("edit.timezoneResults", { count }),
    }),
    [t],
  );
  return <SearchablePicker id={id} label={label} value={value} onChange={onChange} options={OPTIONS} texts={texts} />;
}
