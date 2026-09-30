"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import { formatDuration } from "@/components/album/album-format";
import { VersionAttributeTags } from "@/components/catalog/VersionAttributeTags";
import type { RecordingVersions, VersionEntry, VersionGroup } from "@/services/catalog/recording-versions";
import { groupByDisc, variantLabel, type VersionDiscRow } from "./song-versions";

// "Otras versiones de la canción" (openspec: redesign-song-page, `song-versions`; pestañas y
// tabla desde song-versions-tabs): las demás grabaciones de la obra, por tipo de versión según
// los atributos de MusicBrainz (sin deducir nada). Un grupo a la vista por pestaña (un grupo
// único va como subtítulo) y una fila por disco, con sus grabaciones como variantes. Todo es
// estado local: las filas ya vienen del servidor.

const GROUP_ORDER: VersionGroup[] = ["covers", "live", "others"];
/** Filas (discos) visibles de un grupo antes del "+N". */
export const ROWS_VISIBLE = 10;

// Columnas: año | (artista) | disco | grabaciones. Clases literales para que Tailwind las vea.
const COLUMNS_OWN = "sm:grid-cols-[3rem_minmax(0,1fr)_minmax(0,1.2fr)]";
const COLUMNS_COVERS = "sm:grid-cols-[3rem_minmax(0,11rem)_minmax(0,1fr)_minmax(0,1.2fr)]";

function RecordingItem({ entry, label }: { entry: VersionEntry; label: string }) {
  // En vivo y cover ya los dice el grupo; tampoco se repite un atributo que ya dice la variante.
  const extra = entry.attributes.filter(
    (attribute) =>
      attribute !== "live" && attribute !== "cover" && attribute.toLocaleLowerCase() !== label.toLocaleLowerCase(),
  );
  return (
    <li className="min-w-0">
      <Link
        href={songHref(entry.artist?.name ?? null, entry.title, entry.recordingId)}
        className="font-body text-sm text-paper-muted underline decoration-ink-border underline-offset-4 [overflow-wrap:anywhere] hover:text-amber hover:decoration-amber"
      >
        {label}
      </Link>
      <VersionAttributeTags attributes={extra} />
      {entry.durationSec !== null && (
        <span className="ml-2 font-data text-xs text-paper-muted">{formatDuration(entry.durationSec)}</span>
      )}
    </li>
  );
}

function DiscRow({ row, songTitle, withArtist }: { row: VersionDiscRow; songTitle: string; withArtist: boolean }) {
  const t = useTranslations("catalog.song.versions");
  const labels = row.recordings.map((entry) => variantLabel(entry.title, songTitle));
  const unnamedTotal = labels.filter((label) => label === null).length;
  let unnamed = 0;
  const artist = row.artist && (
    <Link href={artistHref(row.artist.name, row.artist.id)} className="text-paper [overflow-wrap:anywhere] hover:text-amber hover:underline">
      {row.artist.name}
    </Link>
  );
  return (
    <li
      className={`grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-2.5 ${
        withArtist ? COLUMNS_COVERS : COLUMNS_OWN
      }`}
    >
      <span className="font-data text-xs text-paper-muted">{row.disc?.year ?? "—"}</span>
      {withArtist && <span className="min-w-0 font-body text-sm">{artist}</span>}
      <span className={`min-w-0 font-body text-sm ${withArtist ? "col-start-2 sm:col-start-auto" : ""}`}>
        {row.disc ? (
          <Link
            href={albumHref(row.artist?.name ?? null, row.disc.title, row.disc.releaseGroupId)}
            className="text-paper [overflow-wrap:anywhere] hover:text-amber hover:underline"
          >
            {row.disc.title}
          </Link>
        ) : (
          <span className="text-paper-muted">{t("noDisc")}</span>
        )}
        {/* En los grupos propios, una grabación acreditada a otra entrada del catálogo. */}
        {!withArtist && artist && <span className="block font-data text-xs">{artist}</span>}
      </span>
      <ul className="col-start-2 flex min-w-0 flex-wrap gap-x-4 gap-y-1 sm:col-start-auto">
        {row.recordings.map((entry, index) => {
          const variant = labels[index] ?? null;
          if (variant === null) unnamed += 1;
          const label = variant ?? (unnamedTotal > 1 ? t("recordingN", { n: unnamed }) : t("openVersion"));
          return <RecordingItem key={entry.recordingId} entry={entry} label={label} />;
        })}
      </ul>
    </li>
  );
}

interface GroupTableProps {
  entries: VersionEntry[];
  songTitle: string;
  songArtistIds: Set<string>;
  withArtist: boolean;
}

function GroupTable({ entries, songTitle, songArtistIds, withArtist }: GroupTableProps) {
  const t = useTranslations("catalog.song.versions");
  const [showAll, setShowAll] = useState(false);
  const rows = groupByDisc(entries, songArtistIds);
  const hidden = rows.length - ROWS_VISIBLE;
  const headClass = "font-data text-xs uppercase tracking-wider text-paper-muted";
  return (
    <div className="flex flex-col">
      <div
        aria-hidden="true"
        className={`hidden gap-x-4 border-b border-ink-border pb-1.5 sm:grid ${withArtist ? COLUMNS_COVERS : COLUMNS_OWN}`}
      >
        <span className={headClass}>{t("columns.year")}</span>
        {withArtist && <span className={headClass}>{t("columns.artist")}</span>}
        <span className={headClass}>{t("columns.disc")}</span>
        <span className={headClass}>{t("columns.recordings")}</span>
      </div>
      <ol className="flex flex-col divide-y divide-ink-border">
        {(showAll ? rows : rows.slice(0, ROWS_VISIBLE)).map((row) => (
          <DiscRow key={row.key} row={row} songTitle={songTitle} withArtist={withArtist} />
        ))}
      </ol>
      {hidden > 0 && (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((current) => !current)}
          className="self-start pt-2 font-data text-xs text-amber hover:underline"
        >
          {showAll ? t("showLess") : t("showMore", { count: hidden })}
        </button>
      )}
    </div>
  );
}

interface SongVersionsProps {
  versions: RecordingVersions;
  /** Título de la canción: las variantes son lo que cada título le agrega. */
  songTitle: string;
  /** Artistas principales de la canción: en sus propias versiones no se repite el nombre. */
  songArtistIds: string[];
}

export function SongVersions({ versions, songTitle, songArtistIds }: SongVersionsProps) {
  const t = useTranslations("catalog.song.versions");
  const baseId = useId();
  const [selected, setSelected] = useState<VersionGroup | null>(null);
  const groups = GROUP_ORDER.filter((group) => versions[group].length > 0);
  const [first] = groups;
  if (!first) return null;
  const active = selected !== null && groups.includes(selected) ? selected : first;
  const artists = new Set(songArtistIds);

  const table = (group: VersionGroup) => (
    <GroupTable
      key={group}
      entries={versions[group]}
      songTitle={songTitle}
      songArtistIds={artists}
      withArtist={group === "covers"}
    />
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = groups.indexOf(active);
    const next = groups[(index + (event.key === "ArrowRight" ? 1 : groups.length - 1)) % groups.length] ?? first;
    setSelected(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  return (
    <section aria-labelledby="song-versions" className="flex flex-col gap-3">
      <h2 id="song-versions" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
      {groups.length === 1 ? (
        // Un solo grupo: su nombre es un subtítulo y no hacen falta pestañas.
        <>
          <h3 className="font-data text-xs uppercase tracking-wider text-paper-muted">{t(`groups.${first}`)}</h3>
          {table(first)}
        </>
      ) : (
        <>
          <div role="tablist" aria-label={t("tablist")} className="flex flex-wrap gap-2" onKeyDown={onKeyDown}>
            {groups.map((group) => {
              const isActive = group === active;
              return (
                <button
                  key={group}
                  id={`${baseId}-tab-${group}`}
                  role="tab"
                  type="button"
                  aria-selected={isActive}
                  aria-controls={`${baseId}-panel-${group}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setSelected(group)}
                  className={`rounded border px-3 py-1.5 font-data text-xs transition-colors ${
                    isActive ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
                  }`}
                >
                  {t(`groups.${group}`)} · {versions[group].length}
                </button>
              );
            })}
          </div>
          <div id={`${baseId}-panel-${active}`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`}>
            {table(active)}
          </div>
        </>
      )}
    </section>
  );
}
