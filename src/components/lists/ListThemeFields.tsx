"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useTargetSearch, TARGET_SEARCH_MIN_LENGTH } from "@/components/quick-actions/use-target-search";
import { searchGenres } from "@/lib/api/genres";
import type { GenreSearchResponse, ListSubject, ListTheme } from "@/lib/api/schemas";
import { LIST_THEMES } from "@/services/lists/types";
import { LIST_THEME_DOTS, useListSubjectName } from "./list-theme-tones";

/**
 * Selector de tema (openspec: add-list-themes-phase1). `grid`: cuadrícula de radios con nombre y descripción (formulario
 * de lista); `chips`: solo los nombres, para el panel rápido y el aviso de clasificación. Nunca preselecciona.
 */
export function ListThemePicker({
  value,
  onChange,
  variant = "grid",
  name,
  legend,
}: {
  value: ListTheme | null;
  onChange: (theme: ListTheme) => void;
  variant?: "grid" | "chips";
  /** Nombre del grupo de radios; único por formulario. */
  name: string;
  /** Sin leyenda visible (el aviso ya titula la fila), se usa como etiqueta accesible. */
  legend?: string;
}) {
  const t = useTranslations("lists.theme");
  return (
    <fieldset className="min-w-0">
      <legend className={legend ? "sr-only" : "mb-2 font-data text-sm text-paper"}>{legend ?? t("label")}</legend>
      {legend ? null : <p className="-mt-1 mb-2 font-body text-xs text-paper-muted">{t("pickerHint")}</p>}
      <div
        className={
          variant === "grid" ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2"
        }
      >
        {LIST_THEMES.map((theme) => {
          const checked = value === theme;
          return (
            <label
              key={theme}
              className={
                variant === "grid"
                  ? `flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber ${
                      checked ? "border-amber bg-amber/[0.06]" : "border-ink-border bg-ink hover:border-paper-muted/40"
                    }`
                  : `inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3 font-display text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-amber ${
                      checked ? "border-paper bg-paper text-ink" : "border-ink-border bg-ink-surface text-paper-muted hover:text-paper"
                    }`
              }
            >
              <input
                type="radio"
                name={name}
                value={theme}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(theme)}
              />
              {variant === "grid" ? (
                <>
                  {/* Nombre en papel con el punto del tono: una pastilla se partía en dos líneas en un diálogo angosto. */}
                  <span className="flex items-baseline gap-2 font-display text-sm leading-tight text-paper">
                    <span aria-hidden className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${LIST_THEME_DOTS[theme]}`} />
                    {t(`names.${theme}`)}
                  </span>
                  <span className="font-body text-xs leading-snug text-paper-muted">{t(`descriptions.${theme}`)}</span>
                </>
              ) : (
                t(`names.${theme}`)
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type GenreOption = GenreSearchResponse["genres"][number];

function useGenreSearch(query: string): { results: GenreOption[]; pending: boolean } {
  const [state, setState] = useState<{ key: string; results: GenreOption[] } | null>(null);
  const q = query.trim();
  useEffect(() => {
    if (q.length < TARGET_SEARCH_MIN_LENGTH) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchGenres(q)
        .then((res) => !cancelled && setState({ key: q, results: res.genres }))
        .catch(() => !cancelled && setState({ key: q, results: [] }));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);
  const fresh = state?.key === q;
  return { results: fresh ? state.results : [], pending: q.length >= TARGET_SEARCH_MIN_LENGTH && !fresh };
}

/**
 * "¿Sobre qué es?" (openspec: add-list-themes-phase1): un artista (búsqueda de objetivos, que ya devuelve ids locales) o
 * un género (`GET /api/genres/search`). Opcional; quitarlo deja `null`.
 */
export function ListSubjectPicker({
  value,
  onChange,
}: {
  value: ListSubject | null;
  onChange: (subject: ListSubject | null) => void;
}) {
  const t = useTranslations("lists.theme");
  const nameOf = useListSubjectName();
  const [kind, setKind] = useState<"artist" | "genre">(value?.type ?? "artist");
  const [query, setQuery] = useState("");
  const inputId = useId();
  const artists = useTargetSearch("artist", kind === "artist" ? query : "");
  const genres = useGenreSearch(kind === "genre" ? query : "");

  // El subtítulo del candidato (país, desambiguación) distingue a dos artistas con el mismo nombre.
  const options: { subject: ListSubject; hint: string | null }[] =
    kind === "artist"
      ? artists.candidates
          .slice(0, 6)
          .map((c) => ({ subject: { type: "artist" as const, id: c.id, name: c.title }, hint: c.subtitle }))
      : genres.results.slice(0, 6).map((g) => ({
          subject: { type: "genre" as const, id: g.id, slug: g.slug, name: g.name, nameEs: g.nameEs },
          hint: null,
        }));
  const searching = query.trim().length >= TARGET_SEARCH_MIN_LENGTH;
  const pending = kind === "artist" ? artists.pending : genres.pending;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <label htmlFor={inputId} className="font-data text-sm text-paper">
          {t("subjectLabel")}
        </label>
        <span className="font-data text-xs text-paper-muted">{t("subjectHint")}</span>
      </div>
      {value ? (
        <div className="flex min-h-11 items-center justify-between gap-3 rounded border border-ink-border bg-ink px-3">
          <span className="min-w-0 truncate font-display text-sm text-paper">
            {nameOf(value)}
            <span className="ml-2 font-data text-xs text-paper-muted">
              {value.type === "artist" ? t("subjectArtist") : t("subjectGenre")}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t("subjectRemove", { name: nameOf(value) })}
            className="grid size-11 shrink-0 place-items-center text-lg text-paper-muted hover:text-paper"
          >
            ×
          </button>
        </div>
      ) : (
        <>
          <div role="group" aria-label={t("subjectLabel")} className="inline-flex w-fit rounded-lg border border-ink-border bg-ink p-1">
            {(["artist", "genre"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => {
                  setKind(option);
                  setQuery("");
                }}
                className={`min-h-9 rounded-md px-3 font-display text-sm transition-colors [@media(pointer:coarse)]:min-h-11 ${
                  kind === option ? "bg-paper text-ink" : "text-paper-muted hover:text-paper"
                }`}
              >
                {option === "artist" ? t("subjectArtist") : t("subjectGenre")}
              </button>
            ))}
          </div>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={kind === "artist" ? t("subjectSearchArtist") : t("subjectSearchGenre")}
            autoComplete="off"
            className="min-h-11 rounded border border-ink-border bg-ink px-3 font-body text-sm text-paper placeholder:text-paper-muted/70"
          />
          {searching ? (
            <ul className="flex flex-col rounded border border-ink-border bg-ink-surface" aria-busy={pending}>
              {options.map(({ subject: option, hint }) => (
                <li key={`${option.type}:${option.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setQuery("");
                    }}
                    className="flex min-h-11 w-full items-baseline gap-2 px-3 py-2 text-left font-display text-sm text-paper hover:bg-ink"
                  >
                    {nameOf(option)}
                    {hint ? <span className="truncate font-data text-xs text-paper-muted">{hint}</span> : null}
                  </button>
                </li>
              ))}
              {!pending && options.length === 0 ? (
                <li className="px-3 py-2 font-data text-xs text-paper-muted">{t("subjectNoResults")}</li>
              ) : null}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Lo que un formulario manda del "sobre" al guardar. */
export function subjectFields(subject: ListSubject | null): { subjectArtistId: string | null; subjectGenreId: string | null } {
  return {
    subjectArtistId: subject?.type === "artist" ? subject.id : null,
    subjectGenreId: subject?.type === "genre" ? subject.id : null,
  };
}
