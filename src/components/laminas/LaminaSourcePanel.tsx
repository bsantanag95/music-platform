"use client";

import { useLocale, useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { decadeLabel } from "@/services/discovery/decade-label";
import { genreDisplayName, genreLocaleOf } from "@/services/genres/names";
import type { LaminaFilterState, LaminaSourceChoice, LaminaSourceState } from "./use-lamina-source";

// Fuente de una Lámina (spec top-laminas): filtros y candidatos con los primeros ya elegidos. Se usa al crear y al completar;
// quién confirma y qué pasa después lo decide quien lo muestra.

const field = "w-full rounded border border-ink-border bg-ink px-2 py-1.5 font-data text-xs text-paper";

export function LaminaSourceTabs({
  source,
  options,
  onChange,
}: {
  source: LaminaSourceChoice;
  options: readonly LaminaSourceChoice[];
  onChange: (source: LaminaSourceChoice) => void;
}) {
  const t = useTranslations("laminas");
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="font-data text-xs text-paper-muted">{t("source.legend")}</legend>
      <div className="flex flex-wrap gap-1 rounded border border-ink-border p-0.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={source === option}
            onClick={() => onChange(option)}
            className={`min-h-9 flex-1 rounded px-3 py-1 font-data text-xs transition-colors ${source === option ? "bg-ink-border text-paper" : "text-paper-muted hover:text-paper"}`}
          >
            {t(`source.${option}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Filter({
  label,
  name,
  state,
  children,
}: {
  label: string;
  name: keyof LaminaFilterState;
  state: LaminaSourceState;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 font-data text-xs text-paper-muted">
      {label}
      <select value={state.filters[name]} onChange={(event) => state.setFilter(name, event.target.value)} className={field}>
        {children}
      </select>
    </label>
  );
}

/** `rankStart` es el puesto del primero que entra; `null` en una grilla, que no numera. */
export function LaminaSourcePanel({ state, rankStart }: { state: LaminaSourceState; rankStart: number | null }) {
  const t = useTranslations("laminas");
  const locale = useLocale();
  const { options, candidates, selected, slots, source } = state;
  if (source === "manual") return null;

  const hasSourceItems = source === "list" ? (options?.lists.length ?? 0) > 0 : (options?.years.length ?? 0) + (options?.artists.length ?? 0) > 0;
  const filtered = Object.values(state.filters).some(Boolean) && source !== "list";
  const full = selected.length >= slots;
  const selectedIds = selected.map((candidate) => candidate.target.id);

  return (
    <div className="flex flex-col gap-3">
      {options && source === "list" && hasSourceItems ? (
        <Filter label={t("filters.list")} name="list" state={state}>
          {options.lists.map((list) => (
            <option key={list.id} value={list.id}>
              {t("filters.listOption", { title: list.title, count: list.itemCount })}
            </option>
          ))}
        </Filter>
      ) : null}

      {options && source !== "list" && hasSourceItems ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Filter label={t("filters.period")} name="period" state={state}>
            <option value="">{t("filters.any")}</option>
            <optgroup label={t("filters.decades")}>
              {options.decades.map((decade) => (
                <option key={decade} value={`decade:${decade}`}>
                  {decadeLabel(decade, locale)}
                </option>
              ))}
            </optgroup>
            <optgroup label={t("filters.years")}>
              {options.years.map((year) => (
                <option key={year} value={`year:${year}`}>
                  {year}
                </option>
              ))}
            </optgroup>
          </Filter>
          <Filter label={t("filters.listenYear")} name="listenYear" state={state}>
            <option value="">{t("filters.any")}</option>
            {options.listenYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </Filter>
          <Filter label={t("filters.genre")} name="genre" state={state}>
            <option value="">{t("filters.any")}</option>
            {options.genres.map((genre) => (
              <option key={genre.slug} value={genre.slug}>
                {genreDisplayName(genre, genreLocaleOf(locale))}
              </option>
            ))}
          </Filter>
          <Filter label={t("filters.artist")} name="artist" state={state}>
            <option value="">{t("filters.any")}</option>
            {options.artists.map((artist) => (
              <option key={artist.id} value={artist.id}>
                {artist.name}
              </option>
            ))}
          </Filter>
        </div>
      ) : null}

      {state.failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("source.loadError")}
        </p>
      ) : state.loading ? (
        <p role="status" className="font-data text-xs text-paper-muted">
          {t("source.loading")}
        </p>
      ) : !hasSourceItems ? (
        <p className="font-body text-sm text-paper-muted">{t(`source.empty.${source}`)}</p>
      ) : candidates.length === 0 ? (
        <p className="font-body text-sm text-paper-muted">{filtered ? t("source.noResults") : t("source.nothingLeft")}</p>
      ) : (
        <>
          <p className="font-data text-xs text-paper-muted">{t("source.selected", { count: selected.length, slots })}</p>
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {candidates.map((candidate) => {
              const position = selectedIds.indexOf(candidate.target.id);
              const checked = position >= 0;
              return (
                <li key={candidate.target.id}>
                  <label className={`flex min-h-11 items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-ink ${!checked && full ? "opacity-50" : ""}`}>
                    <input type="checkbox" checked={checked} disabled={!checked && full} onChange={() => state.toggle(candidate.target.id)} className="size-4 shrink-0" />
                    {rankStart !== null ? <span className="w-5 shrink-0 text-center font-data text-xs text-paper-muted">{checked ? rankStart + position : ""}</span> : null}
                    <CoverThumb cover={candidate.target.coverThumbUrl} label="" className="size-10 shrink-0 rounded" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-display text-sm text-paper">{candidate.target.title}</span>
                      {candidate.target.artistName ? <span className="truncate font-data text-xs text-paper-muted">{candidate.target.artistName}</span> : null}
                    </span>
                    {candidate.score ? (
                      <span className="shrink-0 font-data text-xs text-paper-muted">
                        {candidate.score.detailedScore != null ? `${candidate.score.detailedScore}/100` : `${Number(candidate.score.stars)}★`}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
