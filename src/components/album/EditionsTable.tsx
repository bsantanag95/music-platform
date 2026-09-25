"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { musicBrainzReleaseUrl } from "@/lib/site-links";

// Pestaña Ediciones del álbum (openspec: redesign-album-page, tarea 8.3): tabla de todas las
// ediciones con filtro por formato y solo las oficiales por defecto. Las ediciones no tienen
// página propia: cada fila enlaza a MusicBrainz, y las que agregan pistas llevan a su sección
// en la pestaña Canciones. Elegir o filtrar no cambia la tracklist principal.

export type FormatFamily = "vinyl" | "cd" | "digital" | "cassette" | "other";

export interface EditionRow {
  id: string;
  mbid: string;
  title: string;
  status: string | null;
  year: number | null;
  releaseDate: string | null;
  country: string | null;
  formats: string[];
  trackCount: number | null;
  labels: { name: string | null; catalogNumber: string | null }[];
  /** Variante con pistas adicionales a la que pertenece la edición, si alguna. */
  variant: { editionId: string; extraTracks: number } | null;
}

const PAGE = 50;

/** Familia de formato para el filtro ("12\" Vinyl" → vinyl, "Hybrid SACD (CD layer)" → cd). */
export function formatFamily(format: string): FormatFamily {
  if (/vinyl/i.test(format)) return "vinyl";
  if (/\bcd\b|sacd|hdcd|blu-spec|shm-cd/i.test(format)) return "cd";
  if (/digital/i.test(format)) return "digital";
  if (/cassette/i.test(format)) return "cassette";
  return "other";
}

/** Formatos compactos: "2×CD", "CD + DVD". */
export function describeFormats(formats: string[]): string {
  const counts = new Map<string, number>();
  for (const f of formats) counts.set(f, (counts.get(f) ?? 0) + 1);
  return [...counts].map(([format, n]) => (n > 1 ? `${n}×${format}` : format)).join(" + ");
}

interface EditionsTableProps {
  releaseGroupId: string;
  editions: EditionRow[];
  representativeMbid: string | null;
}

export function EditionsTable({ releaseGroupId, editions, representativeMbid }: EditionsTableProps) {
  const t = useTranslations("catalog.album.editions");
  const [family, setFamily] = useState<FormatFamily | "all">("all");
  const [includeUnofficial, setIncludeUnofficial] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  const official = editions.filter((e) => e.status === "Official");
  const families = [...new Set(editions.flatMap((e) => e.formats.map(formatFamily)))];
  const filtered = editions.filter(
    (e) =>
      (includeUnofficial || e.status === "Official" || e.mbid === representativeMbid) &&
      (family === "all" || e.formats.some((f) => formatFamily(f) === family)),
  );

  return (
    <section aria-labelledby="editions-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="editions-heading" className="font-display text-xl text-paper">
          {t("heading")}
        </h2>
        <p className="font-data text-xs text-paper-muted">
          {t("summary", { total: editions.length, official: official.length })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t("formatFilter")} className="flex flex-wrap gap-1">
          {(["all", ...families] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={family === option}
              onClick={() => {
                setFamily(option);
                setVisible(PAGE);
              }}
              className={`rounded border px-2 py-0.5 font-data text-xs ${
                family === option ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
              }`}
            >
              {option === "all" ? t("allFormats") : t(`families.${option}`)}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-data text-xs text-paper-muted">
          <input
            type="checkbox"
            checked={includeUnofficial}
            onChange={(event) => {
              setIncludeUnofficial(event.target.checked);
              setVisible(PAGE);
            }}
          />
          {t("includeUnofficial")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="font-body text-paper-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-ink-border font-data text-xs text-paper-muted">
                <th scope="col" className="w-14 py-2 pr-3 font-normal">{t("columns.year")}</th>
                <th scope="col" className="w-14 py-2 pr-3 font-normal">{t("columns.country")}</th>
                <th scope="col" className="py-2 pr-3 font-normal">{t("columns.format")}</th>
                <th scope="col" className="py-2 pr-3 font-normal">{t("columns.label")}</th>
                <th scope="col" className="w-16 py-2 pr-3 text-right font-normal">{t("columns.tracks")}</th>
                <th scope="col" className="w-8 py-2 font-normal">
                  <span className="sr-only">{t("columns.link")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, visible).map((edition) => {
                const shown = edition.mbid === representativeMbid;
                const label = edition.labels
                  .map((l) => [l.name, l.catalogNumber].filter(Boolean).join(" · "))
                  .filter(Boolean)
                  .join(" / ");
                const status = edition.status && edition.status !== "Official" && t.has(`status.${edition.status}`)
                  ? t(`status.${edition.status}`)
                  : null;
                return (
                  <tr
                    key={edition.id}
                    className={`border-b border-ink-border align-baseline font-data text-xs ${shown ? "bg-amber/10" : ""}`}
                  >
                    <td className="py-2 pr-3 text-paper">{edition.year ?? t("unknown")}</td>
                    <td className="py-2 pr-3 text-paper-muted">{edition.country ?? t("unknown")}</td>
                    <td className="py-2 pr-3 text-paper-muted">{describeFormats(edition.formats) || t("unknown")}</td>
                    <td className="py-2 pr-3 text-paper">
                      {label || t("unknown")}
                      {shown && <span className="ml-2 text-amber">· {t("shown")}</span>}
                      {status && <span className="ml-2 text-paper-muted">· {status}</span>}
                      {edition.variant && (
                        <Link
                          href={`/album/${releaseGroupId}#variant-${edition.variant.editionId}`}
                          className="ml-2 text-amber hover:underline"
                        >
                          {t("extra", { count: edition.variant.extraTracks })}
                        </Link>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right text-paper-muted">{edition.trackCount ?? t("unknown")}</td>
                    <td className="py-2">
                      <a
                        href={musicBrainzReleaseUrl(edition.mbid)}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t("openInMusicBrainz", { title: edition.title })}
                        className="text-paper-muted hover:text-amber"
                      >
                        ↗
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > visible && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE)}
          className="self-start rounded border border-ink-border px-4 py-2 font-display text-sm text-paper"
        >
          {t("showMore", { count: Math.min(PAGE, filtered.length - visible) })}
        </button>
      )}
    </section>
  );
}
