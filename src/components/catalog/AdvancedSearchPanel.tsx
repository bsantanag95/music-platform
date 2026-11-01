"use client";

import { useMemo, useState, type ReactNode, type SubmitEventHandler } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { countryOptions } from "@/lib/personal-info";
import {
  activeFilterCount,
  formatDuration,
  parseDurationInput,
  type AdvancedFilters,
} from "@/services/catalog/search/filters";
import { normalizeSearch, SearchablePicker, type PickerOption } from "@/components/profiles/SearchablePicker";
import { searchHref, type SearchType } from "./search-types";

// Búsqueda avanzada (openspec: add-advanced-search-phase1): botón "Filtros · n" junto al campo
// de /search y panel desplegable debajo. El panel es un formulario GET hacia /search: sin
// JavaScript el navegador envía los campos (el servidor ignora los vacíos); con JavaScript se
// navega solo con los que tienen valor, así la URL queda limpia y se puede enlazar.

const YEAR_PATTERN = "\\d{4}";
const DURATION_PATTERN = "\\d{1,3}(:[0-5]\\d)?";

/** Tipos con panel: Usuarios no tiene filtros en esta fase. */
export function hasAdvancedFilters(type: SearchType): boolean {
  return type !== "user";
}

export function AdvancedSearchToggle({
  open,
  onToggle,
  count,
  panelId,
}: {
  open: boolean;
  onToggle: () => void;
  count: number;
  panelId: string;
}) {
  const t = useTranslations("catalog.search.advanced");
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={onToggle}
      className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded border px-4 font-display text-sm transition-colors ${
        open || count > 0
          ? "border-amber/70 text-paper"
          : "border-ink-border text-paper-muted hover:border-amber/60 hover:text-paper"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="10" y1="18" x2="14" y2="18" />
      </svg>
      {count > 0 ? t("toggleCount", { count }) : t("toggle")}
    </button>
  );
}

interface PanelProps {
  id: string;
  type: SearchType;
  query: string;
  filters: AdvancedFilters;
  /** Parámetros ajenos al panel que se conservan (`artistType`, `category`). La década no: el rango la reemplaza. */
  preserved: Record<string, string>;
  /** Cerrado: queda en el DOM (destino de `aria-controls`) pero oculto. */
  hidden?: boolean;
}

type Values = Record<"country" | "beginFrom" | "beginTo" | "ended" | "yearFrom" | "yearTo" | "artist" | "durMin" | "durMax", string>;

function initialValues(filters: AdvancedFilters): Values {
  const text = (value: number | undefined) => (value === undefined ? "" : String(value));
  const duration = (value: number | undefined) => (value === undefined ? "" : formatDuration(value));
  return {
    country: filters.country ?? "",
    beginFrom: text(filters.beginFrom),
    beginTo: text(filters.beginTo),
    ended: filters.ended === undefined ? "" : filters.ended ? "1" : "0",
    yearFrom: text(filters.yearFrom),
    yearTo: text(filters.yearTo),
    artist: filters.artist ?? "",
    durMin: duration(filters.durMin),
    durMax: duration(filters.durMax),
  };
}

const inputClass =
  "h-10 w-full rounded border border-ink-border bg-ink-surface px-3 font-body text-sm text-paper placeholder:text-paper-muted focus:border-amber/70 focus:outline-none";

export function AdvancedSearchPanel({ id, type, query, filters, preserved, hidden = false }: PanelProps) {
  const t = useTranslations("catalog.search.advanced");
  const locale = useLocale();
  const router = useRouter();
  const [values, setValues] = useState<Values>(() => initialValues(filters));
  const set = (key: keyof Values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));

  const countries: PickerOption[] = useMemo(
    () => countryOptions(locale).map(({ code, name }) => ({ value: code, label: name, haystack: normalizeSearch(name) })),
    [locale],
  );
  const countryTexts = useMemo(
    () => ({
      none: t("countryAny"),
      searchPlaceholder: t("countrySearch"),
      noResults: (text: string) => t("countryNoResults", { query: text }),
      results: (count: number) => t("countryResults", { count }),
    }),
    [t],
  );

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const params: Record<string, string> = { ...preserved };
    for (const [key, raw] of Object.entries(values) as [keyof Values, string][]) {
      const value = raw.trim();
      if (!value) continue;
      // La URL lleva segundos; el panel muestra m:ss.
      if (key === "durMin" || key === "durMax") {
        const seconds = parseDurationInput(value);
        if (seconds !== undefined) params[key] = String(seconds);
      } else {
        params[key] = value;
      }
    }
    router.push(searchHref(type, query, params));
  };

  const yearInput = (key: "beginFrom" | "beginTo" | "yearFrom" | "yearTo", label: string) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="font-data text-xs text-paper-muted">{label}</span>
      <input
        name={key}
        value={values[key]}
        onChange={(event) => set(key)(event.target.value)}
        inputMode="numeric"
        pattern={YEAR_PATTERN}
        maxLength={4}
        placeholder={t("yearPlaceholder")}
        className={inputClass}
      />
    </label>
  );

  let fields: ReactNode = null;
  if (type === "artist") {
    fields = (
      <>
        <div className="flex flex-col">
          <SearchablePicker
            id={`${id}-country`}
            label={t("country")}
            value={values.country}
            onChange={set("country")}
            options={countries}
            texts={countryTexts}
          />
          {values.country ? <input type="hidden" name="country" value={values.country} /> : null}
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-display text-sm text-paper-muted">{t("begin")}</legend>
          <p className="font-data text-[11px] text-paper-muted">{t("beginHint")}</p>
          <div className="flex gap-2">
            {yearInput("beginFrom", t("from"))}
            {yearInput("beginTo", t("to"))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm text-paper-muted">{t("ended")}</span>
          <select name="ended" value={values.ended} onChange={(event) => set("ended")(event.target.value)} className={inputClass}>
            <option value="">{t("endedAny")}</option>
            <option value="0">{t("endedActive")}</option>
            <option value="1">{t("endedInactive")}</option>
          </select>
          <span className="font-data text-[11px] text-paper-muted">{t("endedHint")}</span>
        </label>
      </>
    );
  } else if (type === "album" || type === "song") {
    const artistField = (
      <label className="flex flex-col gap-1.5">
        <span className="font-display text-sm text-paper-muted">{t("artist")}</span>
        <input
          name="artist"
          value={values.artist}
          onChange={(event) => set("artist")(event.target.value)}
          maxLength={200}
          placeholder={t("artistPlaceholder")}
          autoComplete="off"
          className={inputClass}
        />
      </label>
    );
    fields =
      type === "album" ? (
        <>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="font-display text-sm text-paper-muted">{t("years")}</legend>
            <div className="flex gap-2">
              {yearInput("yearFrom", t("from"))}
              {yearInput("yearTo", t("to"))}
            </div>
          </fieldset>
          {artistField}
        </>
      ) : (
        <>
          {artistField}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="font-display text-sm text-paper-muted">{t("duration")}</legend>
            <div className="flex gap-2">
              {(["durMin", "durMax"] as const).map((key) => (
                <label key={key} className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-data text-xs text-paper-muted">{t(key)}</span>
                  <input
                    name={key}
                    value={values[key]}
                    onChange={(event) => set(key)(event.target.value)}
                    pattern={DURATION_PATTERN}
                    title={t("durationInvalid")}
                    placeholder={t("durationPlaceholder")}
                    className={inputClass}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </>
      );
  }

  return (
    <form
      id={id}
      method="get"
      action="/search"
      aria-label={t("panelLabel")}
      hidden={hidden}
      onSubmit={onSubmit}
      className={`${hidden ? "hidden" : "flex"} w-full flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface/70 p-4`}
    >
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="q" value={query} />
      {Object.entries(preserved).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <div className="grid gap-4 sm:grid-cols-2">{fields}</div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="h-10 rounded bg-amber px-4 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
        >
          {t("apply")}
        </button>
        {activeFilterCount(filters) > 0 ? (
          <Link
            href={searchHref(type, query, preserved)}
            className="font-data text-xs text-paper-muted underline-offset-4 hover:text-paper hover:underline"
          >
            {t("clear")}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
