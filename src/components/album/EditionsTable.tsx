"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { albumHref } from "@/lib/catalog-links";
import { musicBrainzReleaseUrl } from "@/lib/site-links";
import { SECONDARY_LINK, SEGMENT_GROUP, SEGMENT_OPTION } from "@/components/ui/segmented";

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

/** Orden fijo de los filtros (openspec: refine-album-page-phase3, D4): el formato más común primero. */
const FAMILY_ORDER: FormatFamily[] = ["cd", "vinyl", "cassette", "digital", "other"];

/** Formatos de MusicBrainz con nombre en la interfaz; el resto ("SACD", "Blu-ray") es nombre propio del dato. */
const KNOWN_FORMATS: Record<string, "vinyl" | "cassette" | "digital" | "eightTrack" | "cdr" | "enhancedCd"> = {
  Vinyl: "vinyl",
  Cassette: "cassette",
  "Digital Media": "digital",
  "8-Track Cartridge": "eightTrack",
  "CD-R": "cdr",
  "Enhanced CD": "enhancedCd",
};

type FormatTranslator = (key: string, values?: Record<string, string>) => string;

/**
 * Nombre de un formato en el idioma de la interfaz (openspec: refine-album-page-phase3, D3): "12\" Vinyl" → "Vinilo
 * 12″" conservando la medida; un formato desconocido queda tal como lo nombra MusicBrainz.
 */
export function formatName(format: string, t: FormatTranslator): string {
  const size = /^(\d+)" Vinyl$/.exec(format);
  if (size?.[1]) return t("formatNames.vinylSize", { size: size[1] });
  const known = KNOWN_FORMATS[format];
  return known ? t(`formatNames.${known}`) : format;
}

/** Formatos compactos: "2×CD", "CD + DVD". Con `name`, cada formato con su nombre en la interfaz. */
export function describeFormats(formats: string[], name: (format: string) => string = (format) => format): string {
  const counts = new Map<string, number>();
  for (const f of formats) counts.set(f, (counts.get(f) ?? 0) + 1);
  return [...counts].map(([format, n]) => (n > 1 ? `${n}×${name(format)}` : name(format))).join(" + ");
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
  const name = (format: string) => formatName(format, t);
  // Ediciones que se ven con el filtro de no oficiales; los filtros de formato cuentan sobre ellas.
  const inScope = editions.filter(
    (e) => includeUnofficial || e.status === "Official" || e.mbid === representativeMbid,
  );
  const hasFamily = (e: EditionRow, option: FormatFamily) => e.formats.some((f) => formatFamily(f) === option);
  // Solo las familias con alguna edición visible: un filtro con 0 llevaría a una tabla vacía.
  const families = FAMILY_ORDER.filter((option) => inScope.some((e) => hasFamily(e, option)));
  const countOf = (option: FormatFamily | "all") =>
    option === "all" ? inScope.length : inScope.filter((e) => hasFamily(e, option)).length;
  const filtered = inScope.filter((e) => family === "all" || hasFamily(e, family));

  return (
    <section aria-labelledby="editions-heading" className="flex flex-col gap-3">
      {/* La pestaña activa ya dice "Ediciones": el título queda para lectores de pantalla y la primera fila es la
          barra de filtros (openspec: refine-album-page-phase1). */}
      <h2 id="editions-heading" className="sr-only">
        {t("heading")}
      </h2>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label={t("formatFilter")} className={SEGMENT_GROUP}>
          {(["all", ...families] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={family === option}
              onClick={() => {
                setFamily(option);
                setVisible(PAGE);
              }}
              className={SEGMENT_OPTION}
            >
              {option === "all" ? t("allFormats") : t(`families.${option}`)}
              {" "}
              <span className="text-paper-muted">{countOf(option)}</span>
            </button>
          ))}
        </div>
        <p className="font-data text-xs text-paper-muted">
          {t("summary", { total: editions.length, official: official.length })}
        </p>
        <label className="flex items-center gap-2 font-data text-xs text-paper-muted sm:ml-auto">
          <input
            type="checkbox"
            checked={includeUnofficial}
            onChange={(event) => {
              setIncludeUnofficial(event.target.checked);
              // Al ocultar las no oficiales, la familia elegida puede quedarse sin ediciones.
              if (!event.target.checked) setFamily("all");
              setVisible(PAGE);
            }}
          />
          {t("includeUnofficial")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="font-body text-paper-muted">{t("empty")}</p>
      ) : (
        // Desde `sm` la tabla cabe y su cabecera queda fija bajo las pestañas; un `sticky` no funciona dentro de un
        // contenedor con `overflow-x: auto`, así que solo desplaza en móvil (openspec: refine-album-page-phase3, D5).
        <div className="overflow-x-auto sm:overflow-visible">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead className="sm:sticky sm:top-[calc(var(--site-header-h)+var(--album-tabs-h))] sm:z-10 sm:bg-ink">
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
                    <td className="py-2 pr-3 text-paper-muted">{describeFormats(edition.formats, name) || t("unknown")}</td>
                    <td className="py-2 pr-3 text-paper">
                      {label || t("unknown")}
                      {shown && (
                        <span className="ml-2 whitespace-nowrap rounded bg-amber/15 px-1.5 py-px text-amber">{t("shown")}</span>
                      )}
                      {status && <span className="ml-2 text-paper-muted">· {status}</span>}
                      {edition.variant && (
                        <Link
                          href={`${albumHref(null, "", releaseGroupId)}#variant-${edition.variant.editionId}`}
                          className={`ml-2 ${SECONDARY_LINK}`}
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
