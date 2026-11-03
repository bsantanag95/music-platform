import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { countryName } from "@/components/artist/artist-format";
import { formatStars } from "@/components/album/album-format";
import { formatDuration, type ResultHighlight } from "@/services/catalog/search/filters";
import type { AlbumSearchResult, ArtistSearchResult, SongGroupResult } from "@/services/catalog/search/types";
import { searchHref } from "../search-types";

// Vista Tabla de la búsqueda avanzada (openspec: refine-advanced-search-phase3), al estilo de Metal Archives: una fila
// por resultado y una columna por dato, con las columnas de los criterios de la búsqueda marcadas. Sin ordenar por
// columna: MusicBrainz no ordena y ordenar solo la página engañaría. Sin "use client": la primera página se
// prerenderiza en el servidor y "Cargar más" agrega tablas con las mismas columnas (`table-fixed`, mismos anchos).

type Column = { key: string; width: string; hit?: ResultHighlight };

const COLUMNS: Record<"artist" | "album" | "song", Column[]> = {
  artist: [
    { key: "name", width: "30%" },
    { key: "type", width: "12%", hit: "type" },
    { key: "country", width: "15%", hit: "country" },
    { key: "area", width: "17%", hit: "area" },
    { key: "years", width: "14%", hit: "years" },
    { key: "discs", width: "12%" },
  ],
  album: [
    { key: "title", width: "34%" },
    { key: "artist", width: "22%", hit: "artist" },
    { key: "category", width: "14%", hit: "category" },
    { key: "year", width: "8%", hit: "year" },
    { key: "community", width: "12%" },
    { key: "yours", width: "10%" },
  ],
  song: [
    { key: "title", width: "50%" },
    { key: "artist", width: "35%", hit: "artist" },
    { key: "duration", width: "15%", hit: "duration" },
  ],
};

type Props =
  | { type: "artist"; rows: ArtistSearchResult[]; highlight: ResultHighlight[]; header?: boolean }
  | { type: "album"; rows: AlbumSearchResult[]; highlight: ResultHighlight[]; header?: boolean }
  | { type: "song"; rows: SongGroupResult[]; highlight: ResultHighlight[]; header?: boolean };

const cellClass = "truncate px-3 py-2 font-data text-xs";
const linkClass = "block truncate font-display text-sm text-paper transition-colors hover:text-amber";

export function ResultsTable(props: Props) {
  const t = useTranslations("catalog");
  const locale = useLocale();
  const { type, highlight, header = true } = props;
  const columns = COLUMNS[type];
  const marked = (column: Column) => Boolean(column.hit && highlight.includes(column.hit));
  // Una sola clase de color por celda: con dos, gana la que Tailwind genere después.
  const color = (column: Column) => (marked(column) ? "text-amber" : "text-paper-muted");

  const cells = (values: (string | null)[]) =>
    columns.slice(1).map((column, index) => (
      <td key={column.key} className={`${cellClass} ${color(column)}`}>
        {values[index] ?? "—"}
      </td>
    ));

  const years = (artist: ArtistSearchResult) =>
    artist.beginYear
      ? artist.endYear
        ? t("search.results.artists.yearsRange", { begin: artist.beginYear, end: artist.endYear })
        : t("search.results.artists.yearsSince", { begin: artist.beginYear })
      : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] table-fixed border-collapse">
        <colgroup>
          {columns.map((column) => (
            <col key={column.key} style={{ width: column.width }} />
          ))}
        </colgroup>
        {header ? (
          <thead>
            <tr className="border-b border-ink-border">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-3 py-2 text-left font-data text-[11px] font-normal uppercase tracking-wider ${color(column)}`}
                >
                  {t(`search.advanced.table.${type}.${column.key}`)}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody className="divide-y divide-ink-border">
          {props.type === "artist"
            ? props.rows.map((artist) => (
                <tr key={artist.id}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <Link href={artistHref(artist.name, artist.id)} className={linkClass}>
                      {artist.name}
                    </Link>
                  </th>
                  {cells([
                    artist.artistType === "unknown" ? null : t(`artist.typeLabels.${artist.artistType}`),
                    countryName(artist.country, locale) ?? artist.country,
                    artist.beginArea ?? null,
                    years(artist),
                    artist.discCount ? String(artist.discCount) : null,
                  ])}
                </tr>
              ))
            : props.type === "album"
              ? props.rows.map((album) => (
                  <tr key={album.id}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <Link href={albumHref(album.artistName, album.title, album.id)} className={linkClass}>
                        {album.title}
                      </Link>
                    </th>
                    {cells([
                      album.artistName,
                      t(`artist.categories.${album.category}`),
                      album.year !== null ? String(album.year) : null,
                      album.community?.average != null
                        ? `${formatStars(album.community.average, locale)} · ${album.community.count}`
                        : null,
                      album.yourStars != null ? formatStars(album.yourStars, locale) : null,
                    ])}
                  </tr>
                ))
              : props.rows.map((group) => (
                  <tr key={group.key}>
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <Link href={searchHref("song", group.query)} className={linkClass}>
                        {group.title}
                      </Link>
                    </th>
                    {cells([group.artistName, group.durationSec != null ? formatDuration(group.durationSec) : null])}
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  );
}
