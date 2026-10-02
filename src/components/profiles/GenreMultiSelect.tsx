"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchGenres } from "@/lib/api/genres";
import { queryKeys } from "@/lib/query/keys";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";

// Selector de "Géneros que me mueven" (openspec: show-genres, capability `genre-search`, D6):
// buscador sobre todos los géneros de estilo de la taxonomía (nombre en español o inglés), con
// chips quitables, contador "n de max" y listbox accesible con teclado. Con el campo vacío ofrece
// los géneros más usados. Puro cliente: la lista y las etiquetas de los ya elegidos llegan por
// props/API; no conoce la base.

const DEBOUNCE_MS = 200;

interface GenreMultiSelectProps {
  title: string;
  hint: string;
  counterLabel: string;
  /** Slugs elegidos, en el orden en que se eligieron. */
  selected: string[];
  /** Etiquetas de los géneros ya elegidos (las de los nuevos se aprenden de los resultados). */
  labels: Record<string, string>;
  max: number;
  onChange: (next: string[]) => void;
}

export function GenreMultiSelect({ title, hint, counterLabel, selected, labels, max, onChange }: GenreMultiSelectProps) {
  const t = useTranslations("users.musicIdentity.editor");
  const locale = genreLocaleOf(useLocale());
  const inputId = useId();
  const listId = `${inputId}-list`;
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  // Etiquetas de géneros que la persona eligió en esta sesión (no estaban en `labels`).
  const [learned, setLearned] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const query = useQuery({
    queryKey: queryKeys.genreSearch(debounced),
    queryFn: () => searchGenres(debounced),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const full = selected.length >= max;
  const results = (query.data?.genres ?? []).filter((g) => !selected.includes(g.slug));
  const labelOf = (slug: string) => labels[slug] ?? learned[slug] ?? slug;

  function add(slug: string, label: string) {
    if (full || selected.includes(slug)) return;
    setLearned((prev) => ({ ...prev, [slug]: label }));
    onChange([...selected, slug]);
    setText("");
    setActive(0);
  }

  const activeResult = results[Math.min(active, results.length - 1)];

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="flex w-full items-baseline justify-between gap-3 font-display text-sm text-paper-muted">
        <span>{title}</span>
        <span className="font-data text-xs">{counterLabel}</span>
      </legend>
      <p className="font-body text-xs text-paper-muted">{hint}</p>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {selected.map((slug) => (
            <li key={slug}>
              <button
                type="button"
                aria-label={t("genreRemove", { genre: labelOf(slug) })}
                onClick={() => onChange(selected.filter((item) => item !== slug))}
                className="rounded-full border border-amber bg-amber/10 px-3 py-1 font-display text-sm text-paper"
              >
                {labelOf(slug)} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <label htmlFor={inputId} className="sr-only">
        {t("genreSearchLabel")}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={!full}
        aria-controls={listId}
        aria-activedescendant={activeResult ? `${listId}-${activeResult.slug}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={full}
        value={text}
        placeholder={full ? t("genreFull") : t("genreSearchPlaceholder")}
        onChange={(event) => {
          setText(event.target.value);
          setActive(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === "Enter" && activeResult) {
            // Enter agrega el género activo; no envía el formulario.
            event.preventDefault();
            add(activeResult.slug, genreDisplayName(activeResult, locale));
          }
        }}
        className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper disabled:cursor-not-allowed disabled:opacity-50"
      />

      {!full && (
        <div className="flex flex-col gap-1">
          {debounced.length === 0 && results.length > 0 && (
            <p className="font-data text-xs text-paper-muted">{t("genreSuggestions")}</p>
          )}
          <ul id={listId} role="listbox" aria-label={t("genreSearchLabel")} className="flex flex-wrap gap-2">
            {results.map((g, index) => {
              const name = genreDisplayName(g, locale);
              return (
                <li
                  key={g.slug}
                  id={`${listId}-${g.slug}`}
                  role="option"
                  aria-selected={index === Math.min(active, results.length - 1)}
                >
                  <button
                    type="button"
                    aria-label={t("genreAdd", { genre: name })}
                    onClick={() => add(g.slug, name)}
                    className={`rounded-full border px-3 py-1 font-display text-sm transition-colors ${
                      index === Math.min(active, results.length - 1)
                        ? "border-amber text-paper"
                        : "border-ink-border text-paper-muted hover:border-amber hover:text-paper"
                    }`}
                  >
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
          {query.isFetching && results.length === 0 && (
            <p className="font-data text-xs text-paper-muted">{t("genreSearching")}</p>
          )}
          {!query.isFetching && debounced.length > 0 && results.length === 0 && (
            <p className="font-data text-xs text-paper-muted">{t("genreNoResults")}</p>
          )}
        </div>
      )}
    </fieldset>
  );
}
