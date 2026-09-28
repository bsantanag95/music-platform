"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDuration } from "@/components/album/album-format";
import { VersionAttributeTags } from "@/components/catalog/VersionAttributeTags";
import type { RecordingVersions, VersionEntry, VersionGroup } from "@/services/catalog/recording-versions";

// "Otras versiones de la canción" (openspec: redesign-song-page, `song-versions`; presentación
// desde polish-song-appearances-versions): las demás grabaciones de la obra, por tipo de versión
// según los atributos de MusicBrainz (sin deducir nada). Con varios grupos, los de hasta 5
// grabaciones arrancan desplegados; un solo grupo va sin acordeón. Desplegar es estado local:
// las filas ya vienen del servidor.

const GROUP_ORDER: VersionGroup[] = ["covers", "live", "others"];
/** Un grupo con hasta tantas grabaciones arranca desplegado. */
export const OPEN_UP_TO = 5;
/** Grabaciones visibles de un grupo único antes del "+N". */
export const SINGLE_GROUP_VISIBLE = 10;

const sameTitle = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

interface RowContext {
  songTitle: string;
  songArtistIds: Set<string>;
}

function VersionRow({ entry, songTitle, songArtistIds }: { entry: VersionEntry } & RowContext) {
  // En vivo y cover ya los dice el grupo; se muestran los demás atributos (instrumental, …).
  const extra = entry.attributes.filter((attribute) => attribute !== "live" && attribute !== "cover");
  const otherArtist = entry.artist && !songArtistIds.has(entry.artist.id) ? entry.artist : null;
  // La línea principal es el artista si es otro; el título solo si agrega algo.
  const primary = otherArtist ? otherArtist.name : entry.title;
  const showTitle = otherArtist !== null && !sameTitle(entry.title, songTitle);
  const disc = entry.disc;
  const showDiscTitle = disc !== null && !sameTitle(disc.title, songTitle) && !sameTitle(disc.title, entry.title);
  const discText = disc && [showDiscTitle ? disc.title : null, disc.year].filter((part) => part !== null).join(" · ");
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-baseline gap-x-3 py-2">
      <span className="min-w-0">
        <Link href={`/song/${entry.recordingId}`} className="font-body text-sm text-paper [overflow-wrap:anywhere] hover:text-amber">
          {primary}
        </Link>
        <VersionAttributeTags attributes={extra} />
        {(showTitle || discText) && (
          <span className="block font-data text-xs text-paper-muted [overflow-wrap:anywhere]">
            {showTitle && entry.title}
            {showTitle && discText && " · "}
            {disc && discText && (
              <Link
                href={`/album/${disc.releaseGroupId}`}
                title={showDiscTitle ? undefined : disc.title}
                className="hover:text-amber hover:underline"
              >
                {discText}
              </Link>
            )}
          </span>
        )}
      </span>
      <span className="text-right font-data text-xs text-paper-muted">
        {entry.durationSec !== null ? formatDuration(entry.durationSec) : ""}
      </span>
    </li>
  );
}

function VersionList({ id, entries, context }: { id?: string; entries: VersionEntry[]; context: RowContext }) {
  return (
    <ol id={id} className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
      {entries.map((entry) => (
        <VersionRow key={entry.recordingId} entry={entry} {...context} />
      ))}
    </ol>
  );
}

interface SongVersionsProps {
  versions: RecordingVersions;
  /** Título de la canción: en las filas no se repite. */
  songTitle: string;
  /** Artistas principales de la canción: en sus propias versiones no se repite el nombre. */
  songArtistIds: string[];
}

export function SongVersions({ versions, songTitle, songArtistIds }: SongVersionsProps) {
  const t = useTranslations("catalog.song.versions");
  const groups = GROUP_ORDER.filter((group) => versions[group].length > 0);
  const [open, setOpen] = useState<Set<VersionGroup>>(
    () => new Set(groups.filter((group) => versions[group].length <= OPEN_UP_TO)),
  );
  const [showAll, setShowAll] = useState(false);
  if (groups.length === 0) return null;
  const context: RowContext = { songTitle, songArtistIds: new Set(songArtistIds) };

  const heading = (
    <h2 id="song-versions" className="font-display text-lg text-paper">
      {t("heading")}
    </h2>
  );

  // Un solo grupo: su nombre es un subtítulo y no hace falta acordeón.
  const [single] = groups;
  if (groups.length === 1 && single) {
    const group = single;
    const entries = versions[group];
    const hidden = entries.length - SINGLE_GROUP_VISIBLE;
    return (
      <section aria-labelledby="song-versions" className="flex flex-col gap-2">
        {heading}
        <h3 className="font-data text-xs uppercase tracking-wider text-paper-muted">{t(`groups.${group}`)}</h3>
        <VersionList entries={showAll ? entries : entries.slice(0, SINGLE_GROUP_VISIBLE)} context={context} />
        {hidden > 0 && (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((current) => !current)}
            className="self-start font-data text-xs text-amber hover:underline"
          >
            {showAll ? t("showLess") : t("showMore", { count: hidden })}
          </button>
        )}
      </section>
    );
  }

  const toggle = (group: VersionGroup) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <section aria-labelledby="song-versions" className="flex flex-col gap-3">
      {heading}
      <ul className="flex flex-col gap-2">
        {groups.map((group) => {
          const isOpen = open.has(group);
          const panelId = `versions-${group}`;
          return (
            <li key={group} className="rounded border border-ink-border">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(group)}
                className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left"
              >
                <span className="font-body text-sm text-paper">
                  {t(`groups.${group}`)} <span className="font-data text-xs text-paper-muted">· {versions[group].length}</span>
                </span>
                <span aria-hidden="true" className="font-data text-xs text-paper-muted">
                  {isOpen ? "▴" : "▾"}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-ink-border px-3">
                  <VersionList id={panelId} entries={versions[group]} context={context} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
