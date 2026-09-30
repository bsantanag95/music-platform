"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { TAG_CLASS } from "@/components/catalog/VersionAttributeTags";
import type { ContainingAlbum, GroupedAppearances } from "@/services/catalog/recording-detail";
import { discDateValue, parseDiscDate } from "./disc-date";

// "Esta grabación aparece en" (openspec: redesign-song-page, `song-versions`; columnas y fechas
// desde polish-song-appearances-versions): los discos que contienen esta misma grabación, por
// tipo de disco, con la marca "Primer lanzamiento" en el más temprano. Los discos del artista van
// en una columna y las recopilaciones en otra. Cada grupo muestra 3 discos y un "+N" que
// despliega el resto (estado local).

export const VISIBLE_PER_GROUP = 3;

type Group = GroupedAppearances["groups"][number];

function DiscRow({ disc, year, isOriginal }: { disc: ContainingAlbum; year: number | null; isOriginal: boolean }) {
  const t = useTranslations("catalog.song.appearances");
  const format = useFormatter();
  const parts = parseDiscDate(disc.firstReleaseDate);
  // Mes y año si la fecha los tiene; si no, el año canónico.
  const when =
    parts?.month != null
      ? format.dateTime(discDateValue(parts), { month: "short", year: "numeric", timeZone: "UTC" })
      : (year ?? t("unknownYear"));
  const fullDate =
    parts?.day != null
      ? format.dateTime(discDateValue(parts), { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : null;
  const cover = disc.coverThumbUrl ? (
    <CoverThumb cover={disc.coverThumbUrl} label="" className="size-10 rounded-sm" />
  ) : (
    <LazyCoverImage releaseGroupId={disc.releaseGroupId} coverLabel="" className="size-10 shrink-0 rounded-sm" />
  );
  return (
    <li>
      <Link href={albumHref(null, disc.title, disc.releaseGroupId)} className="group flex items-center gap-3 py-1.5">
        {cover}
        <span className="min-w-0 flex-1">
          <span className="block font-body text-sm text-paper [overflow-wrap:anywhere] group-hover:text-amber">
            {disc.title}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-data text-xs text-paper-muted">
            {when}
            {isOriginal && (
              <span
                title={fullDate ? t("originalOn", { date: fullDate }) : undefined}
                className={`${TAG_CLASS} border-amber/60 text-amber`}
              >
                {t("original")}
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

interface SongAppearancesProps {
  grouped: GroupedAppearances;
  /** Año a mostrar por disco cuando la fecha no tiene mes (lo calcula el servidor). */
  years: Record<string, number | null>;
}

export function SongAppearances({ grouped, years }: SongAppearancesProps) {
  const t = useTranslations("catalog.song.appearances");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (grouped.groups.length === 0) return null;

  const renderGroup = (group: Group) => {
    const open = expanded.has(group.category);
    const visible = open ? group.discs : group.discs.slice(0, VISIBLE_PER_GROUP);
    const hidden = group.discs.length - visible.length;
    return (
      <section key={group.category} aria-labelledby={`appearances-${group.category}`} className="flex min-w-0 flex-col">
        <h3 id={`appearances-${group.category}`} className="font-data text-xs uppercase tracking-wider text-paper-muted">
          {t(`groups.${group.category}`)}
          {group.discs.length > 1 && <span className="normal-case"> · {group.discs.length}</span>}
        </h3>
        <ul className="flex flex-col">
          {visible.map((disc) => (
            <DiscRow
              key={disc.releaseGroupId}
              disc={disc}
              year={years[disc.releaseGroupId] ?? null}
              isOriginal={disc.releaseGroupId === grouped.originalReleaseGroupId}
            />
          ))}
        </ul>
        {group.discs.length > VISIBLE_PER_GROUP && (
          <button
            type="button"
            aria-expanded={open}
            onClick={() =>
              setExpanded((current) => {
                const next = new Set(current);
                if (next.has(group.category)) next.delete(group.category);
                else next.add(group.category);
                return next;
              })
            }
            className="self-start font-data text-xs text-amber hover:underline"
          >
            {open ? t("showLess") : t("showMore", { count: hidden })}
          </button>
        )}
      </section>
    );
  };

  // Con discos del artista y recopilaciones, una columna para cada origen; si no, en cuadrícula.
  const own = grouped.groups.filter((group) => group.category !== "compilation");
  const compilations = grouped.groups.filter((group) => group.category === "compilation");
  const byOrigin = own.length > 0 && compilations.length > 0;

  return (
    <section aria-labelledby="song-appearances" className="flex flex-col gap-3">
      <h2 id="song-appearances" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
      {byOrigin ? (
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">{own.map(renderGroup)}</div>
          <div className="flex min-w-0 flex-col gap-4">{compilations.map(renderGroup)}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">{grouped.groups.map(renderGroup)}</div>
      )}
    </section>
  );
}
