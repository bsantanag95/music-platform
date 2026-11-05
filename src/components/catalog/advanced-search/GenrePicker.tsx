"use client";

import { useEffect, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { searchGenres } from "@/lib/api/genres";
import { queryKeys } from "@/lib/query/keys";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";

// Un género de la taxonomía propia para la búsqueda avanzada (openspec: add-catalog-search-fields): buscador sobre
// `GET /api/genres/search` (capacidad `genre-search`, con los más usados con el campo vacío) que deja el elegido como
// etiqueta quitable y como `<input type="hidden" name="genre">`, así el formulario GET lo envía también sin JavaScript.

const DEBOUNCE_MS = 200;

export function GenrePicker({
  id,
  initial,
  inputClassName,
  onChange,
}: {
  id: string;
  /** Género de la URL, con su nombre ya resuelto. */
  initial: { slug: string; name: string } | null;
  inputClassName: string;
  /** Aviso al formulario (recuento de criterios). */
  onChange?: () => void;
}) {
  const t = useTranslations("catalog.search.advanced");
  const locale = genreLocaleOf(useLocale());
  const listId = `${useId()}-genres`;
  const [selected, setSelected] = useState(initial);
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const query = useQuery({
    queryKey: queryKeys.genreSearch(debounced),
    queryFn: () => searchGenres(debounced),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled: open,
  });
  const results = (query.data?.genres ?? []).slice(0, 8);
  const current = results[Math.min(active, results.length - 1)];

  const choose = (slug: string, name: string) => {
    setSelected({ slug, name });
    setText("");
    setOpen(false);
    setActive(0);
    onChange?.();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display text-sm text-paper-muted">
        {t("genre")}
      </label>
      {selected ? (
        <div className="flex h-10 items-center">
          <input type="hidden" name="genre" value={selected.slug} />
          <button
            type="button"
            id={id}
            onClick={() => {
              setSelected(null);
              onChange?.();
            }}
            aria-label={t("genreRemove", { genre: selected.name })}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/60 px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber"
          >
            {selected.name}
            <span aria-hidden className="text-paper-muted">
              ×
            </span>
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && current ? `${listId}-${current.slug}` : undefined}
            autoComplete="off"
            value={text}
            placeholder={t("genreSearch")}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((index) => Math.min(index + 1, results.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((index) => Math.max(index - 1, 0));
              } else if (event.key === "Enter" && open && current) {
                // Enter elige el género activo; no envía el formulario.
                event.preventDefault();
                choose(current.slug, genreDisplayName(current, locale));
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            className={inputClassName}
          />
          {open && results.length > 0 ? (
            <ul
              id={listId}
              role="listbox"
              aria-label={t("genre")}
              className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded border border-ink-border bg-ink-surface py-1 shadow-lg shadow-black/40"
            >
              {results.map((genre, index) => {
                const name = genreDisplayName(genre, locale);
                return (
                  <li
                    key={genre.slug}
                    id={`${listId}-${genre.slug}`}
                    role="option"
                    aria-selected={genre === current}
                    // Sin perder el foco del campo antes del clic.
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => choose(genre.slug, name)}
                    onPointerEnter={() => setActive(index)}
                    className={`cursor-pointer px-3 py-1.5 font-body text-sm ${genre === current ? "bg-ink text-paper" : "text-paper-muted"}`}
                  >
                    {name}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      )}
      <span className="font-data text-[11px] text-paper-muted">{t("genreHint")}</span>
    </div>
  );
}
