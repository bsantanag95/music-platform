import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SEARCH_TYPES, searchHref, type SearchType } from "../search-types";
import { advancedSearchHref } from "@/services/catalog/search/filters";
import { SearchTypeIcon } from "../SearchTypeIcon";

// Piezas comunes de la página de resultados por tipo (openspec:
// redesign-scoped-search). Sin "use client": se renderizan en el servidor y
// también dentro de los Client Components que cargan más resultados. Con
// `advanced` (página /search/advanced, openspec: redesign-advanced-search) el
// encabezado no repite la consulta ni ofrece otros tipos: eso lo hacen el
// formulario y las pestañas.

/** Accesos para repetir la misma consulta en los otros tipos, sin reescribir. */
export function SearchTypeSwitch({
  query,
  current,
}: {
  query: string;
  current: SearchType;
}) {
  const t = useTranslations("catalog.search");
  return (
    <nav
      aria-label={t("results.switchLabel", { query })}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 font-data text-xs text-paper-muted">
        {t("results.switchLabel", { query })}
      </span>
      {SEARCH_TYPES.filter((type) => type !== current).map((type) => (
        <Link
          key={type}
          href={searchHref(type, query)}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-border px-2.5 py-1 font-data text-xs text-paper-muted transition-colors hover:border-amber/60 hover:text-paper"
        >
          <SearchTypeIcon type={type} className="size-3" />
          {t(`types.${type}`)}
        </Link>
      ))}
    </nav>
  );
}

/** Desde cuántos resultados la cifra se dice "más de 1.000": el total de MusicBrainz no es lo que se recorre. */
export const COUNT_CAP = 1000;

/**
 * Pestañas de tipo bajo el formulario (openspec: refine-search-results-phase2, design D1): la misma consulta en cada
 * tipo, con el actual marcado. Reemplazan a "Buscar «x» en:", que repetía lo que ya dice el selector del campo.
 */
export function SearchTypeTabs({ query, current }: { query: string; current: SearchType }) {
  const t = useTranslations("catalog.search");
  return (
    <nav aria-label={t("results.tabsLabel")} className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-1 border-b border-ink-border">
        {SEARCH_TYPES.map((type) => {
          const active = type === current;
          return (
            <li key={type}>
              <Link
                href={searchHref(type, query)}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 font-display text-sm transition-colors ${
                  active ? "border-amber text-paper" : "border-transparent text-paper-muted hover:text-paper"
                }`}
              >
                <SearchTypeIcon type={type} className="size-3.5" />
                {t(`types.${type}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Encabezado de resultados: pestañas de tipo, consulta y conteo (acotado a "más de 1.000"). */
export function SearchSummary({
  query,
  type,
  count,
  advanced = false,
}: {
  query: string;
  type: SearchType;
  count: number | null;
  advanced?: boolean;
}) {
  const t = useTranslations("catalog.search");
  const countLabel =
    count === null ? null : count > COUNT_CAP ? t("results.countOver", { count: COUNT_CAP }) : t("results.count", { count });
  return (
    <header className="flex flex-col gap-3">
      {advanced ? null : <SearchTypeTabs query={query} current={type} />}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="min-w-0 wrap-break-word font-display text-base text-paper">
          {advanced ? t("advanced.resultsTitle") : t("results.summary", { query })}
        </h2>
        {countLabel !== null ? <span className="shrink-0 font-data text-xs text-paper-muted">{countLabel}</span> : null}
      </div>
    </header>
  );
}

/**
 * Estado vacío del tipo (openspec: refine-search-results-phase1, design D2). Con un filtro activo, el problema es el
 * filtro: se ofrece quitarlo. Sin filtro: "¿Quisiste decir…?" desde el catálogo, consejos, los otros tipos y la
 * búsqueda avanzada. En la avanzada, sugiere menos campos.
 */
export function SearchEmpty({
  query,
  type,
  advanced = false,
  suggestion = null,
  clearFiltersHref = null,
}: {
  query: string;
  type: SearchType;
  advanced?: boolean;
  /** Texto parecido del catálogo para "¿Quisiste decir…?". */
  suggestion?: string | null;
  /** Con filtros activos: la misma búsqueda sin ellos. */
  clearFiltersHref?: string | null;
}) {
  const t = useTranslations("catalog.search");
  if (clearFiltersHref) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-ink-border bg-ink-surface px-5 py-5">
        <h3 className="font-display text-base text-paper">{t("results.filteredEmptyTitle")}</h3>
        <p className="font-body text-sm text-paper-muted">{t("results.filteredEmptyDescription", { query })}</p>
        <Link
          href={clearFiltersHref}
          className="rounded bg-amber px-3 py-1.5 font-display text-sm text-ink transition-colors hover:bg-amber-hover"
        >
          {t("results.clearFilters")}
        </Link>
      </div>
    );
  }
  if (advanced) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-ink-border bg-ink-surface px-5 py-5">
        <h3 className="font-display text-base text-paper">{t("results.emptyTitle")}</h3>
        <p className="font-body text-sm text-paper-muted">{t("advanced.emptyDescription")}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-ink-border bg-ink-surface px-5 py-5">
      <h3 className="font-display text-base text-paper">{t(`results.emptyTitleType.${type}`, { query })}</h3>
      {suggestion ? (
        <p className="font-body text-sm text-paper">
          {t.rich("results.didYouMean", {
            suggestion: () => (
              <Link href={searchHref(type, suggestion)} className="text-amber hover:underline">
                {suggestion}
              </Link>
            ),
          })}
        </p>
      ) : null}
      <ul className="flex list-disc flex-col gap-1 pl-5 font-body text-sm text-paper-muted">
        <li>{t("results.tips.spelling")}</li>
        {type === "album" || type === "song" ? <li>{t("results.tips.artistTitle")}</li> : null}
      </ul>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <SearchTypeSwitch query={query} current={type} />
        {type !== "user" ? (
          <Link
            href={advancedSearchHref(type, query)}
            className="font-data text-xs text-paper-muted transition-colors hover:text-amber"
          >
            {t("results.advancedLink")} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/**
 * "¿Quisiste decir…?" sobre una lista en la que ningún resultado cubre todas las palabras de la consulta (openspec:
 * refine-search-results-phase1, design D2): "pink floid" trae "Pink" de Four Tet y de Aerosmith, nunca una lista vacía.
 */
export function DidYouMean({ type, suggestion }: { type: SearchType; suggestion: string }) {
  const t = useTranslations("catalog.search");
  return (
    <p className="rounded-lg border border-amber/40 bg-ink-surface px-4 py-3 font-body text-sm text-paper">
      {t.rich("results.didYouMean", {
        suggestion: () => (
          <Link href={searchHref(type, suggestion)} className="text-amber hover:underline">
            {suggestion}
          </Link>
        ),
      })}
    </p>
  );
}

/** Total de MusicBrainz desde el que una búsqueda avanzada sin nombre sugiere sumar campos. */
const BROAD_QUERY_THRESHOLD = 500;

/** Búsqueda avanzada sin nombre con muchísimos resultados: sugiere sumar campos. */
export function BroadQueryHint({ total }: { total: number | null }) {
  const t = useTranslations("catalog.search.advanced");
  if (total === null || total <= BROAD_QUERY_THRESHOLD) return null;
  return (
    <p className="rounded-lg border border-ink-border bg-ink-surface/70 px-4 py-3 font-body text-sm text-paper-muted">
      {t("broadQuery", { total })}
    </p>
  );
}

/** Pastillas de filtro como enlaces (la página se re-resuelve con el filtro en la URL). */
export function FilterPills({
  label,
  options,
}: {
  label: string;
  options: { key: string; label: string; href: string; active: boolean }[];
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span className="mr-1 font-data text-xs text-paper-muted">{label}</span>
      {options.map((option) => (
        <Link
          key={option.key}
          href={option.href}
          aria-current={option.active ? "true" : undefined}
          className={`rounded-full border px-2.5 py-1 font-data text-xs transition-colors ${
            option.active
              ? "border-amber text-paper"
              : "border-ink-border text-paper-muted hover:text-paper"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

/** Sugerencia para acotar una consulta genérica: atajos "Artista - consulta". */
export function RefineHint({
  kind,
  query,
  total,
  artists,
}: {
  kind: "album" | "song";
  query: string;
  total: number;
  artists: string[];
}) {
  const t = useTranslations("catalog.search");
  if (artists.length === 0) return null;
  return (
    <aside className="flex flex-col gap-2.5 rounded-lg border border-ink-border bg-ink-surface/70 px-4 py-3">
      <p className="font-body text-sm text-paper-muted">
        {total > COUNT_CAP
          ? t(`results.refine.${kind}Over`, { total: COUNT_CAP, query })
          : t(`results.refine.${kind}`, { total, query })}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {artists.map((artist) => (
          <Link
            key={artist}
            href={searchHref(kind, `${artist} - ${query}`)}
            className="rounded-full border border-ink-border px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber/60 hover:text-amber"
          >
            {artist}
          </Link>
        ))}
      </div>
    </aside>
  );
}

/**
 * Indicador de la pata remota pendiente (fallback del streaming). Va bajo lo local, donde aparecerán las filas nuevas,
 * con dos filas de esqueleto (openspec: refine-search-results-phase2, design D4).
 */
export function PendingRemote() {
  const t = useTranslations("catalog.search");
  return (
    <div className="flex flex-col gap-3">
      <ul aria-hidden className="flex flex-col divide-y divide-ink-border">
        {[0, 1].map((row) => (
          <li key={row} className="flex items-center gap-3 py-3 first:pt-0">
            <span className="size-10 shrink-0 animate-pulse rounded bg-ink-surface" />
            <span className="flex flex-1 flex-col gap-2">
              <span className="h-3 w-2/5 animate-pulse rounded bg-ink-surface" />
              <span className="h-2.5 w-1/4 animate-pulse rounded bg-ink-surface" />
            </span>
          </li>
        ))}
      </ul>
      <p role="status" className="flex items-center gap-2 font-data text-xs text-paper-muted">
        <span className="size-1.5 animate-pulse rounded-full bg-amber" aria-hidden />
        {t("results.pendingRemote")}
      </p>
    </div>
  );
}
