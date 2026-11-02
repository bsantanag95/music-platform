"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { countryOptions } from "@/lib/personal-info";
import { normalizeSearch, SearchablePicker, type PickerOption } from "@/components/profiles/SearchablePicker";

// Varios países para la búsqueda avanzada (openspec: redesign-advanced-search): el selector con
// buscador de países (`SearchablePicker`) agrega uno por vez; cada elegido queda como etiqueta que se
// quita y como `<input type="hidden" name="country">` repetido, así el formulario GET los envía
// también sin JavaScript (con los que ya traía la URL).

const MAX_COUNTRIES = 10;

export function CountryMultiPicker({ id, initial }: { id: string; initial: string[] }) {
  const t = useTranslations("catalog.search.advanced");
  const locale = useLocale();
  const [selected, setSelected] = useState<string[]>(initial);

  const options: PickerOption[] = useMemo(
    () =>
      countryOptions(locale)
        .filter(({ code }) => !selected.includes(code))
        .map(({ code, name }) => ({ value: code, label: name, haystack: normalizeSearch(name) })),
    [locale, selected],
  );
  const names = useMemo(
    () => new Map(countryOptions(locale).map(({ code, name }) => [code, name])),
    [locale],
  );
  const texts = useMemo(
    () => ({
      none: selected.length > 0 ? t("countryAddAnother") : t("countryAny"),
      searchPlaceholder: t("countrySearch"),
      noResults: (query: string) => t("countryNoResults", { query }),
      results: (count: number) => t("countryResults", { count }),
    }),
    [t, selected.length],
  );

  return (
    <div className="flex flex-col gap-2">
      <SearchablePicker
        id={id}
        label={t("country")}
        value=""
        onChange={(code) => {
          if (code && !selected.includes(code) && selected.length < MAX_COUNTRIES) {
            setSelected((current) => [...current, code]);
          }
        }}
        options={options}
        texts={texts}
      />
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("countrySelected")}>
          {selected.map((code) => (
            <li key={code}>
              <input type="hidden" name="country" value={code} />
              <button
                type="button"
                onClick={() => setSelected((current) => current.filter((item) => item !== code))}
                aria-label={t("countryRemove", { country: names.get(code) ?? code })}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber/60 px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber"
              >
                {names.get(code) ?? code}
                <span aria-hidden className="text-paper-muted">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
