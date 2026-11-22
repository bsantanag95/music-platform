import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { albumHref } from "@/lib/catalog-links";
import type { HomeRelease } from "@/services/home/home";
import { formatReleaseDate } from "./release-dates";

/** Filas visibles por parte; el resto queda dentro de «Ver N más», en la misma página. */
export const TIMETABLE_VISIBLE = 6;

export interface TimetableLabels {
  recent: string;
  upcoming: string;
  published: string;
  upcomingBadge: string;
  showMore: (count: number) => string;
  showLess: string;
}

/** Estado de una fila: el texto y si va resaltado (próximo) o apagado (publicado). */
export interface TimetableStatus {
  label: string;
  tone: "upcoming" | "published";
}

interface TimetableLink {
  href: string;
  label: string;
}

/** Parte la selección en recientes (de la más nueva a la más vieja) y próximos (de la más cercana a la más lejana). */
export function splitTimetable(releases: HomeRelease[]) {
  const recent = releases.filter((r) => r.section === "recent").sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  const upcoming = releases
    .filter((r) => r.section === "upcoming")
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  return { recent, upcoming };
}

// Lanzamientos de la portada sin sesión como horario (openspec: redesign-anon-home-phase3, préstamo de la
// propuesta A): dos partes con columnas fijas —fecha, disco, estado— que se leen como un tablero, sin flechas
// sobre las carátulas. Seis filas por parte y el resto en un `<details>` nativo (sin JavaScript). El Inicio
// con sesión sigue con `ReleaseRail`/`ReleaseSwitcher`. Explorar lo usa para su sección Lanzamientos
// (openspec: redesign-explore-phase3) con la cuenta regresiva como estado, "Ver todo" por parte y las anclas
// `novedades`/`proximos` en cada parte.
export function ReleaseTimetable({
  releases,
  locale,
  labels,
  labelledBy,
  status,
  seeAll,
  partIds,
}: {
  releases: HomeRelease[];
  locale: string;
  labels: TimetableLabels;
  /** `id` del encabezado de la sección (prefijo de los `id` de cada parte). */
  labelledBy: string;
  /** Estado de cada fila; por defecto, "Próximo" o "Publicado" según la parte. */
  status?: (release: HomeRelease) => TimetableStatus;
  /** "Ver todo" de cada parte, en lugar de la cifra de filas de su encabezado. */
  seeAll?: { recent?: TimetableLink; upcoming?: TimetableLink };
  /** `id` de cada parte, para enlazarlas como anclas. */
  partIds?: { recent: string; upcoming: string };
}) {
  const { recent, upcoming } = splitTimetable(releases);
  const parts = [
    { key: "recent" as const, title: labels.recent, rows: recent },
    { key: "upcoming" as const, title: labels.upcoming, rows: upcoming },
  ].filter((part) => part.rows.length > 0);
  if (parts.length === 0) return null;

  return (
    <div className={`grid gap-10 ${parts.length === 2 ? "lg:grid-cols-2 lg:gap-14" : ""}`}>
      {parts.map((part) => {
        const headingId = `${labelledBy}-${part.key}`;
        const visible = part.rows.slice(0, TIMETABLE_VISIBLE);
        const rest = part.rows.slice(TIMETABLE_VISIBLE);
        const link = seeAll?.[part.key];
        return (
          <section key={part.key} id={partIds?.[part.key]} aria-labelledby={headingId} className="flex min-w-0 scroll-mt-32 flex-col">
            <div className="flex items-baseline justify-between gap-3 border-b border-paper-muted/40 pb-2.5">
              <h3 id={headingId} className="font-display text-lg text-paper">
                {part.title}
              </h3>
              {link ? (
                <Link
                  href={link.href}
                  className="shrink-0 font-data text-xs text-paper-muted transition-colors hover:text-amber focus-visible:text-amber"
                >
                  {link.label}
                </Link>
              ) : (
                <span className="font-data text-xs text-paper-muted">{part.rows.length}</span>
              )}
            </div>
            <ul className="divide-y divide-ink-border">
              {visible.map((release) => (
                <Row key={release.id} release={release} locale={locale} labels={labels} status={status} />
              ))}
            </ul>
            {rest.length > 0 ? (
              <details className="group">
                <summary className="mt-1 inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md py-2 font-data text-sm text-paper-muted transition-colors hover:text-paper [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">{labels.showMore(rest.length)}</span>
                  <span className="hidden group-open:inline">{labels.showLess}</span>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 transition-transform duration-150 group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <ul className="divide-y divide-ink-border border-t border-ink-border">
                  {rest.map((release) => (
                    <Row key={release.id} release={release} locale={locale} labels={labels} status={status} />
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function Row({
  release,
  locale,
  labels,
  status,
}: {
  release: HomeRelease;
  locale: string;
  labels: TimetableLabels;
  status?: (release: HomeRelease) => TimetableStatus;
}) {
  const state: TimetableStatus = status
    ? status(release)
    : release.section === "upcoming"
      ? { label: labels.upcomingBadge, tone: "upcoming" }
      : { label: labels.published, tone: "published" };
  const upcoming = state.tone === "upcoming";
  return (
    <li>
      <Link
        href={albumHref(release.artist, release.title, release.id)}
        className="group grid grid-cols-[4.5rem_2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 transition-colors hover:bg-ink-surface/60 sm:gap-4"
      >
        <span className="font-data text-xs tabular-nums text-paper-muted">
          {formatReleaseDate(release.releaseDate, locale)}
        </span>
        <CoverThumb cover={release.coverThumbUrl} label="" className="size-10 rounded ring-1 ring-ink-border" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
            {release.title}
          </span>
          <span className="truncate font-body text-sm text-paper-muted">{release.artist}</span>
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-data text-[11px] ${
            upcoming ? "bg-amber/15 text-amber" : "bg-ink-surface text-paper-muted"
          }`}
        >
          {state.label}
        </span>
      </Link>
    </li>
  );
}
