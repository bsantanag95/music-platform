import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SEARCH_TYPES, searchHref, type SearchType } from "../search-types";
import { SearchTypeIcon } from "../SearchTypeIcon";

// Piezas comunes de la página de resultados por tipo (openspec:
// redesign-scoped-search). Sin "use client": se renderizan en el servidor y
// también dentro de los Client Components que cargan más resultados.

/** Accesos para repetir la misma consulta en los otros tipos, sin reescribir. */
export function SearchTypeSwitch({ query, current }: { query: string; current: SearchType }) {
  const t = useTranslations("catalog.search");
  return (
    <nav aria-label={t("results.switchLabel", { query })} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-data text-xs text-paper-muted">{t("results.switchLabel", { query })}</span>
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

/** Encabezado de resultados: consulta, tipo, conteo y cambio de tipo. */
export function SearchSummary({
  query,
  type,
  count,
}: {
  query: string;
  type: SearchType;
  count: number | null;
}) {
  const t = useTranslations("catalog.search");
  return (
    <header className="flex flex-col gap-3 border-b border-ink-border pb-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="min-w-0 break-words font-display text-lg text-paper">
          {t("results.summary", { query })}{" "}
          <span className="inline-flex items-center gap-1.5 align-middle font-data text-xs text-amber">
            <SearchTypeIcon type={type} className="size-3.5" />
            {t("results.inType", { type: t(`types.${type}`).toLowerCase() })}
          </span>
        </h2>
        {count !== null ? (
          <span className="shrink-0 font-data text-xs text-paper-muted">
            {t("results.count", { count })}
          </span>
        ) : null}
      </div>
      <SearchTypeSwitch query={query} current={type} />
    </header>
  );
}

/** Estado vacío del tipo, con los accesos a los otros tipos. */
export function SearchEmpty({ query, type }: { query: string; type: SearchType }) {
  const t = useTranslations("catalog.search");
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-ink-border bg-ink-surface px-6 py-10 text-center">
      <h3 className="font-display text-lg text-paper">{t("results.emptyTitle")}</h3>
      <p className="max-w-sm font-body text-sm text-paper-muted">{t(`results.emptyDescription.${type}`)}</p>
      <SearchTypeSwitch query={query} current={type} />
    </div>
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
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
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
      <p className="font-body text-sm text-paper-muted">{t(`results.refine.${kind}`, { total, query })}</p>
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

/** Indicador de la pata remota pendiente (fallback del streaming). */
export function PendingRemote() {
  const t = useTranslations("catalog.search");
  return (
    <p role="status" className="flex items-center gap-2 font-data text-xs text-paper-muted">
      <span className="size-1.5 animate-pulse rounded-full bg-amber" aria-hidden />
      {t("results.pendingRemote")}
    </p>
  );
}
