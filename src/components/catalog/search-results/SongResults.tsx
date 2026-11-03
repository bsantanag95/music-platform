import { formatDuration, type ResultHighlight } from "@/services/catalog/search/filters";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SongGroupResult, SongSearchResponse } from "@/services/catalog/search/types";
import { searchHref } from "../search-types";
import { SearchTypeIcon } from "../SearchTypeIcon";
import { SongGroupPanel } from "./SongGroupPanel";

// Resultados del tipo Canciones (openspec: redesign-scoped-search): la
// interpretación usada queda a la vista y es corregible, la canción resuelta
// se muestra con sus álbumes, y las demás canciones con ese título (otros
// artistas) son filas que la abren como primera.

/** "Interpretado como canción «x» de Y · ¿Buscabas «y» de X?" */
export function SongInterpretation({
  interpretation,
  alternatives,
}: Pick<SongSearchResponse, "interpretation" | "alternatives">) {
  const t = useTranslations("catalog.search.results.songs");
  if (!interpretation?.artistName) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-data text-xs text-paper-muted">
      <span>{t("interpretation", { song: interpretation.song, artist: interpretation.artistName })}</span>
      {alternatives.map((alternative) => (
        <Link
          key={alternative.query}
          href={searchHref("song", alternative.query)}
          className="text-amber underline-offset-2 transition-colors hover:text-amber-hover hover:underline"
        >
          {t("alternative", { song: alternative.song, artist: alternative.artistName ?? "" })}
        </Link>
      ))}
    </p>
  );
}

export function SongRow({ group, highlight = [] }: { group: SongGroupResult; highlight?: ResultHighlight[] }) {
  const t = useTranslations("catalog.search.results.songs");
  return (
    <Link
      href={searchHref("song", group.query)}
      aria-label={t("openSong", { song: group.artistName ? `${group.title} — ${group.artistName}` : group.title })}
      className="group flex items-center gap-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded bg-ink-surface text-paper-muted">
        <SearchTypeIcon type="song" className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
          {group.title}
        </span>
        {group.artistName ? (
          <span className={`truncate font-data text-xs ${highlight.includes("artist") ? "text-amber" : "text-paper-muted"}`}>
            {group.artistName}
          </span>
        ) : null}
      </span>
      {/* La duración siempre a la derecha; destacada si la búsqueda la filtró (openspec: refine-advanced-search-phase3). */}
      {group.durationSec != null ? (
        <span className={`shrink-0 font-data text-xs ${highlight.includes("duration") ? "text-amber" : "text-paper-muted"}`}>
          {formatDuration(group.durationSec)}
        </span>
      ) : null}
      <span className="shrink-0 font-data text-xs text-paper-muted transition-colors group-hover:text-amber" aria-hidden>
        →
      </span>
    </Link>
  );
}

export function SongList({ groups, highlight }: { groups: SongGroupResult[]; highlight?: ResultHighlight[] }) {
  return (
    <ul className="flex flex-col divide-y divide-ink-border">
      {groups.map((group) => (
        <li key={group.key} className="py-3 first:pt-0 last:pb-0">
          <SongRow group={group} highlight={highlight} />
        </li>
      ))}
    </ul>
  );
}

export function SongResults({
  response,
  plain = false,
  highlight,
}: {
  response: SongSearchResponse;
  /** Búsqueda avanzada sin título: no hay "mejor coincidencia", solo la lista (openspec: refine-advanced-search-phase1). */
  plain?: boolean;
  highlight?: ResultHighlight[];
}) {
  const t = useTranslations("catalog.search.results.songs");
  const [first, ...others] = response.results;
  if (!first) return null;
  if (plain) return <SongList groups={response.results} highlight={highlight} />;

  return (
    <div className="flex flex-col gap-6">
      <SongGroupPanel group={first} />
      {others.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="font-display text-sm text-paper-muted">{t("otherSongs")}</h3>
          <SongList groups={others} highlight={highlight} />
        </section>
      ) : null}
    </div>
  );
}
