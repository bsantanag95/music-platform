"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatDuration } from "@/components/album/album-format";
import { VersionAttributeTags } from "@/components/catalog/VersionAttributeTags";
import type { RecordingVersions, VersionEntry, VersionGroup } from "@/services/catalog/recording-versions";

// "Otras versiones de la canción" (openspec: redesign-song-page, `song-versions`): las demás
// grabaciones de la obra, por tipo de versión según los atributos de MusicBrainz (sin deducir
// nada), en grupos contraídos. Desplegar es estado local: las filas ya vienen del servidor.

const GROUP_ORDER: VersionGroup[] = ["covers", "live", "others"];

function VersionRow({ entry, songArtistIds }: { entry: VersionEntry; songArtistIds: Set<string> }) {
  // En vivo y cover ya los dice el grupo; se muestran los demás atributos (instrumental, …).
  const extra = entry.attributes.filter((attribute) => attribute !== "live" && attribute !== "cover");
  const showArtist = entry.artist && !songArtistIds.has(entry.artist.id);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-baseline gap-x-3 py-2">
      <span className="min-w-0">
        <Link href={`/song/${entry.recordingId}`} className="font-body text-sm text-paper [overflow-wrap:anywhere] hover:text-amber">
          {entry.title}
        </Link>
        <VersionAttributeTags attributes={extra} />
        <span className="block font-data text-xs text-paper-muted">
          {showArtist && entry.artist && (
            <>
              <Link href={`/artist/${entry.artist.id}`} className="text-paper hover:text-amber hover:underline">
                {entry.artist.name}
              </Link>
              {entry.disc && " · "}
            </>
          )}
          {entry.disc && (
            <Link href={`/album/${entry.disc.releaseGroupId}`} className="hover:text-amber hover:underline">
              {entry.disc.title}
              {entry.disc.year !== null && ` · ${entry.disc.year}`}
            </Link>
          )}
        </span>
      </span>
      <span className="text-right font-data text-xs text-paper-muted">
        {entry.durationSec !== null ? formatDuration(entry.durationSec) : ""}
      </span>
    </li>
  );
}

interface SongVersionsProps {
  versions: RecordingVersions;
  /** Artistas principales de la canción: en sus propias versiones no se repite el nombre. */
  songArtistIds: string[];
}

export function SongVersions({ versions, songArtistIds }: SongVersionsProps) {
  const t = useTranslations("catalog.song.versions");
  const [open, setOpen] = useState<Set<VersionGroup>>(new Set());
  const groups = GROUP_ORDER.filter((group) => versions[group].length > 0);
  if (groups.length === 0) return null;
  const artists = new Set(songArtistIds);

  const toggle = (group: VersionGroup) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <section aria-labelledby="song-versions" className="flex flex-col gap-3">
      <h2 id="song-versions" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
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
                <ol id={panelId} className="flex flex-col divide-y divide-ink-border border-t border-ink-border px-3">
                  {versions[group].map((entry) => (
                    <VersionRow key={entry.recordingId} entry={entry} songArtistIds={artists} />
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
