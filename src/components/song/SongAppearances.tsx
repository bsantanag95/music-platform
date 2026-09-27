"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import type { ContainingAlbum, GroupedAppearances } from "@/services/catalog/recording-detail";

// "Esta grabación aparece en" (openspec: redesign-song-page, `song-versions`): los discos que
// contienen esta misma grabación, por tipo de disco, con la marca "original" en el más
// temprano. Cada grupo muestra 3 discos y un "+N" que despliega el resto (estado local).

export const VISIBLE_PER_GROUP = 3;

function DiscRow({ disc, isOriginal }: { disc: ContainingAlbum & { year: number | null }; isOriginal: boolean }) {
  const t = useTranslations("catalog.song.appearances");
  const cover = disc.coverThumbUrl ? (
    <CoverThumb cover={disc.coverThumbUrl} label="" className="size-10 rounded-sm" />
  ) : (
    <LazyCoverImage releaseGroupId={disc.releaseGroupId} coverLabel="" className="size-10 shrink-0 rounded-sm" />
  );
  return (
    <li>
      <Link href={`/album/${disc.releaseGroupId}`} className="group flex items-center gap-3 py-1.5">
        {cover}
        <span className="min-w-0 flex-1">
          <span className="block font-body text-sm text-paper [overflow-wrap:anywhere] group-hover:text-amber">
            {disc.title}
          </span>
          <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
            {disc.year ?? t("unknownYear")}
            {isOriginal && (
              <span className="rounded border border-amber/60 px-1.5 text-amber">{t("original")}</span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}

interface SongAppearancesProps {
  grouped: GroupedAppearances;
  /** Año a mostrar por disco (lo calcula el servidor). */
  years: Record<string, number | null>;
}

export function SongAppearances({ grouped, years }: SongAppearancesProps) {
  const t = useTranslations("catalog.song.appearances");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (grouped.groups.length === 0) return null;

  return (
    <section aria-labelledby="song-appearances" className="flex flex-col gap-3">
      <h2 id="song-appearances" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {grouped.groups.map((group) => {
          const open = expanded.has(group.category);
          const visible = open ? group.discs : group.discs.slice(0, VISIBLE_PER_GROUP);
          const hidden = group.discs.length - visible.length;
          return (
            <section key={group.category} aria-labelledby={`appearances-${group.category}`} className="flex min-w-0 flex-col">
              <h3 id={`appearances-${group.category}`} className="font-data text-xs uppercase tracking-wider text-paper-muted">
                {t(`groups.${group.category}`)} <span className="normal-case">· {group.discs.length}</span>
              </h3>
              <ul className="flex flex-col divide-y divide-ink-border">
                {visible.map((disc) => (
                  <DiscRow
                    key={disc.releaseGroupId}
                    disc={{ ...disc, year: years[disc.releaseGroupId] ?? null }}
                    isOriginal={disc.releaseGroupId === grouped.originalReleaseGroupId}
                  />
                ))}
              </ul>
              {(hidden > 0 || open) && group.discs.length > VISIBLE_PER_GROUP && (
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
        })}
      </div>
    </section>
  );
}
