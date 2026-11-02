"use client";

import { useId, type ReactNode, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  advancedSearchHref,
  CATEGORY_VALUES,
  formatDuration,
  parseDurationInput,
  type SearchCriteria,
} from "@/services/catalog/search/filters";
import type { SearchType } from "../search-types";
import { useAdvancedSearchTransition } from "./AdvancedSearchPending";
import { CountryMultiPicker } from "./CountryMultiPicker";

// Formulario de una pestaña de la búsqueda avanzada (openspec: redesign-advanced-search), al estilo
// de Metal Archives: el nombre o título es un campo más (opcional) con "¿Coincidencia exacta?", la
// identidad a la izquierda y país, fechas y tipos a la derecha. Es un formulario GET con campos no
// controlados: sin JavaScript el navegador envía todo (el servidor ignora los vacíos); con
// JavaScript se navega solo con lo que tiene valor y la duración en segundos.

type AdvancedType = Exclude<SearchType, "user">;

interface Props {
  type: AdvancedType;
  query: string;
  criteria: SearchCriteria;
}

const YEAR_PATTERN = "\\d{4}";
const DURATION_PATTERN = "\\d{1,3}(:[0-5]\\d)?";

const inputClass =
  "h-10 w-full rounded border border-ink-border bg-ink-surface px-3 font-body text-sm text-paper placeholder:text-paper-muted focus:border-amber/70 focus:outline-none";
const labelClass = "font-display text-sm text-paper-muted";
const hintClass = "font-data text-[11px] text-paper-muted";

/** Banderas que solo tienen sentido con su campo. */
const EXACT_OF: Record<string, string> = { exact: "q", artistExact: "artist", albumExact: "album" };

export function AdvancedSearchForm({ type, query, criteria }: Props) {
  const t = useTranslations("catalog.search.advanced");
  const tCategories = useTranslations("catalog.artist.categories");
  const tSearch = useTranslations("catalog.search");
  const router = useRouter();
  const id = useId();
  // Envío en curso: botón deshabilitado y resultados atenuados (openspec: speed-up-search).
  const [isPending, startTransition] = useAdvancedSearchTransition();

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams({ type });
    for (const [key, raw] of data.entries()) {
      const value = String(raw).trim();
      if (key === "type" || !value) continue;
      const field = EXACT_OF[key];
      if (field && !String(data.get(field) ?? "").trim()) continue;
      if (key === "durMin" || key === "durMax") {
        const seconds = parseDurationInput(value);
        if (seconds !== undefined) params.append(key, String(seconds));
      } else {
        params.append(key, value);
      }
    }
    startTransition(() => router.push(`/search/advanced?${params.toString()}`));
  };

  /** Texto con su casilla de coincidencia exacta. */
  const textField = (name: "q" | "artist" | "album", exactName: string, label: string, value: string, exact: boolean) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-${name}`} className={labelClass}>
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={`${id}-${name}`}
          name={name}
          defaultValue={value}
          maxLength={200}
          autoComplete="off"
          className={`${inputClass} sm:flex-1`}
        />
        <label className="inline-flex shrink-0 items-center gap-2 font-data text-xs text-paper-muted">
          <input
            type="checkbox"
            name={exactName}
            value="1"
            defaultChecked={exact}
            aria-label={t("exactMatchFor", { field: label })}
            className="accent-amber"
          />
          {t("exactMatch")}
        </label>
      </div>
    </div>
  );

  const range = (
    fromName: string,
    toName: string,
    legend: string,
    hint: string | null,
    from: number | undefined,
    to: number | undefined,
    pattern: string,
    format: (value: number) => string = String,
    placeholder = t("yearPlaceholder"),
  ) => (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={labelClass}>{legend}</legend>
      {hint ? <p className={hintClass}>{hint}</p> : null}
      <div className="flex gap-2">
        {[
          [fromName, t("from"), from],
          [toName, t("to"), to],
        ].map(([name, label, value]) => (
          <label key={name as string} className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-data text-xs text-paper-muted">{label as string}</span>
            <input
              name={name as string}
              defaultValue={value === undefined ? "" : format(value as number)}
              inputMode={pattern === YEAR_PATTERN ? "numeric" : undefined}
              pattern={pattern}
              title={pattern === DURATION_PATTERN ? t("durationInvalid") : undefined}
              placeholder={placeholder}
              className={inputClass}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );

  const categories = (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={labelClass}>{t("releaseType")}</legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {CATEGORY_VALUES.map((value) => (
          <label key={value} className="inline-flex items-center gap-2 font-body text-sm text-paper">
            <input
              type="checkbox"
              name="category"
              value={value}
              defaultChecked={criteria.category?.includes(value) ?? false}
              className="accent-amber"
            />
            {tCategories(value)}
          </label>
        ))}
      </div>
    </fieldset>
  );

  let left: ReactNode;
  let right: ReactNode;
  if (type === "artist") {
    left = (
      <>
        {textField("q", "exact", t("name"), query, criteria.exact ?? false)}
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("artistType")}</span>
          <select name="artistType" defaultValue={criteria.artistType ?? ""} className={inputClass}>
            <option value="">{t("any")}</option>
            <option value="person">{t("person")}</option>
            <option value="group">{t("group")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("area")}</span>
          <input name="area" defaultValue={criteria.area ?? ""} maxLength={200} autoComplete="off" className={inputClass} />
          <span className={hintClass}>{t("areaHint")}</span>
        </label>
      </>
    );
    right = (
      <>
        <CountryMultiPicker id={`${id}-country`} initial={criteria.country ?? []} />
        {range("beginFrom", "beginTo", t("begin"), t("beginHint"), criteria.beginFrom, criteria.beginTo, YEAR_PATTERN)}
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("ended")}</span>
          <select
            name="ended"
            defaultValue={criteria.ended === undefined ? "" : criteria.ended ? "1" : "0"}
            className={inputClass}
          >
            <option value="">{t("any")}</option>
            <option value="0">{t("endedActive")}</option>
            <option value="1">{t("endedInactive")}</option>
          </select>
          <span className={hintClass}>{t("endedHint")}</span>
        </label>
      </>
    );
  } else if (type === "album") {
    left = (
      <>
        {textField("q", "exact", t("title"), query, criteria.exact ?? false)}
        {textField("artist", "artistExact", t("artist"), criteria.artist ?? "", criteria.artistExact ?? false)}
      </>
    );
    right = (
      <>
        {range("yearFrom", "yearTo", t("releaseYear"), null, criteria.yearFrom, criteria.yearTo, YEAR_PATTERN)}
        {categories}
      </>
    );
  } else {
    left = (
      <>
        {textField("q", "exact", t("songTitle"), query, criteria.exact ?? false)}
        {textField("artist", "artistExact", t("artist"), criteria.artist ?? "", criteria.artistExact ?? false)}
        {textField("album", "albumExact", t("album"), criteria.album ?? "", criteria.albumExact ?? false)}
      </>
    );
    right = (
      <>
        {categories}
        {range(
          "durMin",
          "durMax",
          t("duration"),
          null,
          criteria.durMin,
          criteria.durMax,
          DURATION_PATTERN,
          formatDuration,
          t("durationPlaceholder"),
        )}
      </>
    );
  }

  return (
    <form
      method="get"
      action="/search/advanced"
      onSubmit={onSubmit}
      aria-busy={isPending || undefined}
      aria-label={t("formLabel", { type: t(`tabs.${type}`) })}
      className="flex w-full flex-col gap-6 rounded-lg border border-ink-border bg-ink-surface/70 p-4 sm:p-6"
    >
      <input type="hidden" name="type" value={type} />
      <p className={hintClass}>{t("intro")}</p>
      <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
        <div className="flex flex-col gap-5">{left}</div>
        <div className="flex flex-col gap-5">{right}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded bg-amber px-5 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-60"
        >
          {isPending ? tSearch("submitting") : t("submit")}
        </button>
        <Link
          href={advancedSearchHref(type, "")}
          className="font-data text-xs text-paper-muted underline-offset-4 hover:text-paper hover:underline"
        >
          {t("clear")}
        </Link>
      </div>
    </form>
  );
}
