"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getEditionExtraTracks } from "@/lib/api/catalog";
import { musicBrainzReleaseUrl } from "@/lib/site-links";
import { formatDuration } from "./album-format";
import { describeFormats } from "./EditionsTable";

// Pistas adicionales de otras ediciones, al pie de la pestaña Canciones (openspec:
// redesign-album-page, tarea 7.7): una sección por variante, todas contraídas, con un
// encabezado que identifica la edición. Las pistas se piden al desplegar (la primera vez
// el servidor ingiere la lista de esa edición). Las cajas enlazan a MusicBrainz.

export interface ExtraTracksVariant {
  editionId: string;
  editionMbid: string;
  name: string | null;
  year: number | null;
  labels: string[];
  formats: string[];
  countries: string[];
  editionCount: number;
  estimatedExtraTracks: number;
  isBox: boolean;
  /** Recuento total de pistas (para rotular una caja). */
  totalTracks: number | null;
}

function VariantTracks({ releaseGroupId, editionId }: { releaseGroupId: string; editionId: string }) {
  const t = useTranslations("catalog.album.extraTracks");
  const tVariant = useTranslations("catalog.album.tracks.variant");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["edition-extra-tracks", releaseGroupId, editionId],
    queryFn: () => getEditionExtraTracks(releaseGroupId, editionId),
    staleTime: Infinity,
  });

  if (isLoading) return <p className="px-3 py-2 font-data text-xs text-paper-muted">{t("loading")}</p>;
  if (isError || !data) {
    return (
      <p role="alert" className="flex gap-3 px-3 py-2 font-data text-xs text-danger">
        {t("loadError")}
        <button type="button" onClick={() => void refetch()} className="text-amber underline">
          {t("retry")}
        </button>
      </p>
    );
  }
  if (data.tracks.length === 0) return <p className="px-3 py-2 font-data text-xs text-paper-muted">{t("empty")}</p>;

  const multiDisc = new Set(data.tracks.map((track) => track.discNumber)).size > 1 || data.tracks[0]!.discNumber > 1;
  return (
    <ol className="flex flex-col divide-y divide-ink-border px-3">
      {data.tracks.map((track) => (
        <li
          key={`${track.discNumber}-${track.position}-${track.recordingId}`}
          className="grid grid-cols-[2.5rem_minmax(0,1fr)_3.5rem] items-baseline gap-x-3 py-2"
        >
          <span className="text-right font-data text-xs text-paper-muted">
            {multiDisc ? `${track.discNumber}-${track.position}` : track.position}
          </span>
          <span className="font-body text-sm text-paper [overflow-wrap:anywhere]">
            <Link href={`/song/${track.recordingId}`} className="hover:text-amber">
              {track.title}
            </Link>
            {track.variantType !== "original" && tVariant.has(track.variantType) && (
              <span className="ml-2 rounded border border-ink-border px-1.5 py-0.5 font-data text-xs text-paper-muted">
                {tVariant(track.variantType)}
              </span>
            )}
          </span>
          <span className="text-right font-data text-xs text-paper-muted">
            {track.durationSec !== null ? formatDuration(track.durationSec) : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

interface EditionExtraTracksProps {
  releaseGroupId: string;
  variants: ExtraTracksVariant[];
}

export function EditionExtraTracks({ releaseGroupId, variants }: EditionExtraTracksProps) {
  const t = useTranslations("catalog.album.extraTracks");
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Llegada desde la pestaña Ediciones ("+N pistas" → `#variant-{id}`): abre esa sección.
  useEffect(() => {
    const match = /^#variant-(.+)$/.exec(window.location.hash);
    const id = match?.[1];
    if (id && variants.some((v) => v.editionId === id && !v.isBox)) {
      setOpen((current) => new Set(current).add(id));
      document.getElementById(`variant-${id}`)?.scrollIntoView({ block: "start" });
    }
  }, [variants]);

  if (variants.length === 0) return null;

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section aria-labelledby="extra-tracks-heading" className="flex flex-col gap-2">
      <h3 id="extra-tracks-heading" className="font-display text-lg text-paper">
        {t("heading")}
      </h3>
      <p className="font-data text-xs text-paper-muted">{t("intro")}</p>
      <ul className="flex flex-col gap-2">
        {variants.map((variant) => {
          const format = describeFormats(variant.formats);
          const name =
            variant.name ??
            (variant.year !== null ? t("fallbackName", { year: variant.year, format }) : t("fallbackNameNoYear", { format }));
          const details = [
            variant.year,
            variant.labels[0],
            format,
            variant.editionCount > 1
              ? t("editionCount", { count: variant.editionCount, countries: variant.countries.join(", ") })
              : variant.countries[0],
          ]
            .filter(Boolean)
            .join(" · ");
          const isOpen = open.has(variant.editionId);
          const panelId = `variant-panel-${variant.editionId}`;

          return (
            <li
              key={variant.editionId}
              id={`variant-${variant.editionId}`}
              className="scroll-mt-24 rounded border border-ink-border"
            >
              {variant.isBox ? (
                <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                  <span className="flex flex-col">
                    <span className="font-body text-sm text-paper">
                      {name}{" "}
                      <span className="ml-1 rounded bg-ink-surface px-1.5 font-data text-xs text-paper-muted">
                        {t("box", { count: variant.totalTracks ?? variant.estimatedExtraTracks })}
                      </span>
                    </span>
                    <span className="font-data text-xs text-paper-muted">{details}</span>
                  </span>
                  <a
                    href={musicBrainzReleaseUrl(variant.editionMbid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-data text-xs text-amber hover:underline"
                  >
                    {t("boxLink")} ↗
                  </a>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(variant.editionId)}
                    className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left"
                  >
                    <span className="flex flex-col">
                      <span className="font-body text-sm text-paper">
                        {name}{" "}
                        <span className="ml-1 rounded bg-ink-surface px-1.5 font-data text-xs text-amber">
                          {t("extra", { count: variant.estimatedExtraTracks })}
                        </span>
                      </span>
                      <span className="font-data text-xs text-paper-muted">{details}</span>
                    </span>
                    <span aria-hidden="true" className="font-data text-xs text-paper-muted">
                      {isOpen ? "▴" : "▾"}
                    </span>
                  </button>
                  {isOpen && (
                    <div id={panelId} className="border-t border-ink-border">
                      <VariantTracks releaseGroupId={releaseGroupId} editionId={variant.editionId} />
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
