"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  advancedSearchHref,
  ARTIST_ROLES,
  CATEGORY_VALUES,
  criterionChips,
  formatDuration,
  fromSearchParams,
  parseCriteria,
  parseDurationInput,
  validateAdvancedForm,
  type FormRangeError,
  type SearchCriteria,
} from "@/services/catalog/search/filters";
import type { SearchType } from "../search-types";
import { useAdvancedSearchTransition } from "./AdvancedSearchPending";
import { CountryMultiPicker } from "./CountryMultiPicker";
import { GenrePicker } from "./GenrePicker";

// Formulario de una pestaña de la búsqueda avanzada (openspec: redesign-advanced-search, refine-advanced-search-phase2),
// al estilo de Metal Archives: el nombre o título es un campo más (opcional) con "¿Coincidencia exacta?". Los campos
// van en grupos con nombre (Identidad · Origen · Época, o Identidad · Lanzamiento), todos del mismo ancho y alineados:
// la etiqueta arriba y la ayuda debajo del control; un grupo de tres campos usa tres columnas en pantallas anchas, para no dejar uno solo
// con media fila vacía (openspec: polish-search-forms). Es un formulario GET con campos no controlados: sin JavaScript el navegador envía
// todo (el servidor ignora los vacíos) y valida con `pattern`; con JavaScript valida en español, navega solo con lo que
// tiene valor y la duración en segundos, y la fila de envío cuenta los criterios (fija al pie en móvil).

type AdvancedType = Exclude<SearchType, "user">;
type RangeKey = "begin" | "active" | "year" | "duration";

/** Premio que se puede elegir en "Premios" (los cargados en el catálogo). */
export interface AwardOption {
  slug: string;
  kind: "competition" | "hall_of_fame";
}

interface Props {
  type: AdvancedType;
  query: string;
  criteria: SearchCriteria;
  /** Premios cargados, para el campo del catálogo (openspec: add-catalog-search-fields). */
  awards?: AwardOption[];
  /** Nombre del género de la URL, ya resuelto en el servidor. */
  genreName?: string | null;
}

const YEAR_PATTERN = "\\d{4}";
const DURATION_PATTERN = "\\d{1,3}(:[0-5]\\d)?";

// Fondo más oscuro que la tarjeta: los campos vacíos se leen como campos.
const fieldClass =
  "h-10 w-full rounded border border-ink-border bg-ink font-body text-sm text-paper placeholder:text-paper-muted focus:border-amber/70 focus:outline-none aria-invalid:border-danger";
const inputClass = `${fieldClass} px-3`;
// El `<select>` nativo suma 4 px de margen propio. Sin elección, el texto va en gris como un texto de ejemplo.
const selectClass = `filter-select ${fieldClass} pl-2 pr-2 has-[option[value='']:checked]:text-paper-muted`;
const labelClass = "font-display text-sm text-paper-muted";
const hintClass = "font-data text-[11px] text-paper-muted";

/** Banderas que solo tienen sentido con su campo. */
const EXACT_OF: Record<string, string> = { exact: "q", artistExact: "artist", albumExact: "album" };

/** Lo que el formulario enviaría, como parámetros de la URL (solo los campos con valor). */
function formParams(form: HTMLFormElement, type: AdvancedType): URLSearchParams {
  const data = new FormData(form);
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
  return params;
}

/** Criterios del formulario, contados como en la barra de criterios (un rango, uno; cada país y tipo, uno). */
function countCriteria(form: HTMLFormElement, type: AdvancedType): number {
  const params = formParams(form, type);
  const q = params.get("q") ?? "";
  return criterionChips(type, q, parseCriteria(type, fromSearchParams(params), q)).length;
}

function initialCount(type: AdvancedType, query: string, criteria: SearchCriteria): number {
  return criterionChips(type, query, criteria).length;
}

export function AdvancedSearchForm({ type, query, criteria, awards = [], genreName = null }: Props) {
  const t = useTranslations("catalog.search.advanced");
  const tAwards = useTranslations("awards");
  const tCategories = useTranslations("catalog.artist.categories");
  const tSearch = useTranslations("catalog.search");
  const router = useRouter();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  // Envío en curso: botón deshabilitado y resultados atenuados (openspec: speed-up-search).
  const [isPending, startTransition] = useAdvancedSearchTransition();
  // Sin JavaScript valida el navegador (`pattern`); hidratado, la validación es propia y en español.
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<RangeKey, { error: FormRangeError; field: string }>>>({});
  const [count, setCount] = useState(() => initialCount(type, query, criteria));

  useEffect(() => setHydrated(true), []);
  // El tipo de artista decide la etiqueta del año y si se ofrecen el rol y la actividad (openspec:
  // add-catalog-search-fields, split-person-search-types).
  const [artistType, setArtistType] = useState(criteria.artistType ?? "");

  // Las etiquetas de países cambian sin evento de campo: se recuenta tras cada interacción.
  const recount = () => {
    requestAnimationFrame(() => {
      if (formRef.current) setCount(countCriteria(formRef.current, type));
    });
  };

  const onSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const found = validateAdvancedForm(type, (name) => String(data.get(name) ?? ""));
    setErrors(found);
    const first = Object.values(found)[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first.field}"]`)?.focus();
      return;
    }
    const params = formParams(form, type);
    startTransition(() => router.push(`/search/advanced?${params.toString()}`));
  };

  const onInput = (name: string) => {
    // Al corregir un campo con error, el mensaje se va.
    const range = (Object.keys(errors) as RangeKey[]).find((key) => RANGE_FIELDS[key].includes(name));
    if (range) {
      setErrors((current) => {
        const next = { ...current };
        delete next[range];
        return next;
      });
    }
  };

  /** Texto con su casilla de coincidencia exacta, debajo. */
  const textField = (name: "q" | "artist" | "album", exactName: string, label: string, value: string, exact: boolean) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${id}-${name}`} className={labelClass}>
        {label}
      </label>
      <input
        id={`${id}-${name}`}
        name={name}
        defaultValue={value}
        maxLength={200}
        autoComplete="off"
        className={inputClass}
      />
      <label className="inline-flex items-center gap-2 font-data text-xs text-paper-muted">
        <input
          type="checkbox"
          name={exactName}
          value="1"
          defaultChecked={exact}
          aria-label={t("exactMatchFor", { field: label })}
          className="form-check"
        />
        {t("exactMatch")}
      </label>
    </div>
  );

  const range = (
    key: RangeKey,
    legend: string,
    hint: string | null,
    from: number | undefined,
    to: number | undefined,
    pattern: string,
    format: (value: number) => string = String,
    /** Formato que hay que escribir, junto a "desde" y "hasta". Sin él (años), basta la palabra. */
    placeholder?: string,
  ) => {
    const [fromName, toName] = RANGE_FIELDS[key];
    const error = errors[key];
    const errorId = `${id}-${key}-error`;
    return (
      <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? errorId : undefined}>
        <legend className={`${labelClass} mb-1.5`}>{legend}</legend>
        {/* "Desde" y "Hasta" van en el texto de ejemplo, así el control queda a la altura de los de al lado. */}
        <div className="flex gap-2">
          {[
            [fromName, t("from"), from],
            [toName, t("to"), to],
          ].map(([name, label, value]) => (
            <label key={name as string} className="flex min-w-0 flex-1 flex-col">
              <span className="sr-only">{label as string}</span>
              <input
                name={name as string}
                defaultValue={value === undefined ? "" : format(value as number)}
                inputMode={pattern === YEAR_PATTERN ? "numeric" : undefined}
                pattern={pattern}
                title={pattern === DURATION_PATTERN ? t("durationInvalid") : undefined}
                placeholder={placeholder ? `${(label as string).toLowerCase()} ${placeholder}` : (label as string)}
                aria-invalid={error ? true : undefined}
                onInput={() => onInput(name as string)}
                className={inputClass}
              />
            </label>
          ))}
        </div>
        {hint ? <p className={hintClass}>{hint}</p> : null}
        {error ? (
          <p id={errorId} role="alert" className="font-data text-xs text-danger">
            {t(`errors.${error.error}`)}
          </p>
        ) : null}
      </fieldset>
    );
  };

  const categories = (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={`${labelClass} mb-1.5`}>{t("releaseType")}</legend>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {CATEGORY_VALUES.map((value) => (
          <label key={value} className="inline-flex items-center gap-2 font-body text-sm text-paper">
            <input
              type="checkbox"
              name="category"
              value={value}
              defaultChecked={criteria.category?.includes(value) ?? false}
              className="form-check"
            />
            {tCategories(value)}
          </label>
        ))}
      </div>
    </fieldset>
  );

  const select = (
    name: "artistType" | "ended" | "role" | "award",
    label: string,
    hint: string | null,
    value: string,
    options: [string, string][],
    onChange?: (value: string) => void,
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      <select
        name={name}
        defaultValue={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={selectClass}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  );

  // Premios: cualquiera o uno cargado, y "Solo ganadores" (un salón de la fama cuenta siempre como ganado).
  const awardName = (slug: string) => (tAwards.has(`names.${slug}`) ? tAwards(`names.${slug}`) : slug);
  const awardField = (
    <div className="flex flex-col gap-1.5">
      {select("award", t("award"), null, criteria.award ?? "", [
        ["", t("any")],
        ["any", t("awardAny")],
        ...awards.map((award): [string, string] => [award.slug, awardName(award.slug)]),
      ])}
      <label className="inline-flex items-center gap-2 font-data text-xs text-paper-muted">
        <input type="checkbox" name="awardWon" value="1" defaultChecked={criteria.awardWon ?? false} className="form-check" />
        {t("awardWon")}
      </label>
    </div>
  );
  const genreField = (
    <GenrePicker
      id={`${id}-genre`}
      initial={criteria.genre ? { slug: criteria.genre, name: genreName ?? criteria.genre } : null}
      inputClassName={inputClass}
      onChange={recount}
    />
  );
  const beginLabel = artistType === "group" ? "beginGroup" : artistType ? "beginPerson" : "begin";

  let groups: { legend: string; fields: ReactNode; hint?: string; wide?: boolean }[];
  if (type === "artist") {
    groups = [
      {
        legend: t("groups.identity"),
        wide: artistType === "other",
        fields: <>
          {textField("q", "exact", t("name"), query, criteria.exact ?? false)}
          {select(
            "artistType",
            t("artistType"),
            artistType === "other" ? t("otherHint") : null,
            criteria.artistType ?? "",
            [
              ["", t("any")],
              ["group", t("group")],
              ["solo", t("solo")],
              ["other", t("other")],
            ],
            setArtistType,
          )}
          {/* Solo con Otras personas: al cambiar el tipo el campo sale del formulario y no se envía. */}
          {artistType === "other"
            ? select("role", t("role"), t("roleHint"), criteria.role ?? "", [
                ["", t("any")],
                ...ARTIST_ROLES.map((role): [string, string] => [role, t(`roles.${role}`)]),
              ])
            : null}
        </>,
      },
      {
        legend: t("groups.origin"),
        fields: <>
          <CountryMultiPicker id={`${id}-country`} initial={criteria.country ?? []} inputClassName={inputClass} />
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("area")}</span>
            <input name="area" defaultValue={criteria.area ?? ""} maxLength={200} autoComplete="off" className={inputClass} />
            <span className={hintClass}>{t("areaHint")}</span>
          </label>
        </>,
      },
      {
        legend: t("groups.period"),
        fields: <>
          {range("begin", t(beginLabel), null, criteria.beginFrom, criteria.beginTo, YEAR_PATTERN)}
          {select("ended", t("ended"), t("endedHint"), criteria.ended === undefined ? "" : criteria.ended ? "1" : "0", [
            ["", t("any")],
            ["0", t("endedActive")],
            ["1", t("endedInactive")],
          ])}
        </>,
      },
      {
        legend: t("groups.catalog"),
        hint: t("groups.catalogHint"),
        wide: artistType !== "other",
        fields: <>
          {/* La actividad sale de los discos propios: no aplica a Otras personas. */}
          {artistType === "other"
            ? null
            : range("active", t("active"), t("activeHint"), criteria.activeFrom, criteria.activeTo, YEAR_PATTERN)}
          {genreField}
          {awardField}
        </>,
      },
    ];
  } else if (type === "album") {
    groups = [
      {
        legend: t("groups.identity"),
        fields: <>
          {textField("q", "exact", t("title"), query, criteria.exact ?? false)}
          {textField("artist", "artistExact", t("artist"), criteria.artist ?? "", criteria.artistExact ?? false)}
        </>,
      },
      {
        legend: t("groups.release"),
        fields: <>
          {range("year", t("releaseYear"), null, criteria.yearFrom, criteria.yearTo, YEAR_PATTERN)}
          {categories}
        </>,
      },
      {
        legend: t("groups.catalog"),
        hint: t("groups.catalogHint"),
        wide: true,
        fields: <>
          {genreField}
          <CountryMultiPicker
            id={`${id}-artistCountry`}
            name="artistCountry"
            label={t("artistCountry")}
            initial={criteria.artistCountry ?? []}
            inputClassName={inputClass}
          />
          {awardField}
        </>,
      },
    ];
  } else {
    groups = [
      {
        legend: t("groups.identity"),
        wide: true,
        fields: <>
          {textField("q", "exact", t("songTitle"), query, criteria.exact ?? false)}
          {textField("artist", "artistExact", t("artist"), criteria.artist ?? "", criteria.artistExact ?? false)}
          {textField("album", "albumExact", t("album"), criteria.album ?? "", criteria.albumExact ?? false)}
        </>,
      },
      {
        legend: t("groups.release"),
        fields: <>
          {categories}
          {range(
            "duration",
            t("duration"),
            null,
            criteria.durMin,
            criteria.durMax,
            DURATION_PATTERN,
            formatDuration,
            t("durationPlaceholder"),
          )}
        </>,
      },
    ];
  }

  return (
    <form
      ref={formRef}
      method="get"
      action="/search/advanced"
      noValidate={hydrated}
      onSubmit={onSubmit}
      onInput={recount}
      onChange={recount}
      onClick={recount}
      aria-busy={isPending || undefined}
      aria-label={t("formLabel", { type: t(`tabs.${type}`) })}
      className="flex w-full flex-col gap-6 rounded-lg border border-ink-border bg-ink-surface/70 p-4 sm:p-6"
    >
      <input type="hidden" name="type" value={type} />
      <p className={hintClass}>{t("intro")}</p>
      {groups.map(({ legend, fields, hint: groupHint, wide }) => (
        <fieldset key={legend} className="flex flex-col gap-4 border-t border-ink-border pt-4 first-of-type:border-t-0 first-of-type:pt-0">
          <legend className="float-left mb-1 w-full font-data text-[11px] uppercase tracking-wider text-paper-muted">
            {legend}
          </legend>
          {/* El grupo del catálogo dice que sus campos no buscan en MusicBrainz (openspec: add-catalog-search-fields). */}
          {groupHint ? <p className={`${hintClass} -mt-3`}>{groupHint}</p> : null}
          <div className={`grid gap-x-10 gap-y-5 md:grid-cols-2 ${wide ? "lg:grid-cols-3 lg:gap-x-6" : ""}`}>{fields}</div>
        </fieldset>
      ))}
      {/* Fija al pie en móvil: con el formulario largo, Buscar queda siempre a mano. */}
      <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center gap-3 border-t border-ink-border bg-ink px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:-mb-6 sm:px-6 md:static md:m-0 md:border-0 md:bg-transparent md:p-0">
        {/* Sin criterios no hay cifra a la vista ni nada que limpiar; la región sigue montada para anunciar los cambios. */}
        <span className={count === 0 ? "sr-only" : "font-data text-xs text-paper-muted"} aria-live="polite">
          {t("criteriaCount", { count })}
        </span>
        {count > 0 ? (
          <Link
            href={advancedSearchHref(type, "")}
            className="ml-auto font-data text-xs text-paper-muted underline-offset-4 hover:text-paper hover:underline md:order-last md:ml-0"
          >
            {t("clear")}
          </Link>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded bg-amber px-5 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-60 md:order-first"
        >
          {isPending ? tSearch("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}

/** Nombres de los campos "desde" y "hasta" de cada rango. */
const RANGE_FIELDS: Record<RangeKey, [string, string]> = {
  begin: ["beginFrom", "beginTo"],
  active: ["activeFrom", "activeTo"],
  year: ["yearFrom", "yearTo"],
  duration: ["durMin", "durMax"],
};
