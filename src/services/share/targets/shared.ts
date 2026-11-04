import { slugify } from "@/lib/slug";
import type { ShareTranslator } from "../i18n";

// Piezas comunes de los objetivos de compartir.

export const DESCRIPTION_MAX = 160;

/** Recorta la descripción del enlace a ≤160 caracteres, en un límite de palabra (spec share-metadata). */
export function clipDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Nombre de archivo legible para la descarga, sin caracteres inválidos ("metallica-master-of-puppets"). */
export function downloadName(...parts: Array<string | null | undefined>): string {
  const slug = slugify(parts.filter(Boolean).join(" ")).slice(0, 80).replace(/-+$/, "");
  return slug || "compartir";
}

/** Créditos de una imagen con carátulas y datos del catálogo. */
export function catalogCredits(t: ShareTranslator, withCovers: boolean): string[] {
  return withCovers
    ? [t("share.image.credits.covers"), t("share.image.credits.catalog")]
    : [t("share.image.credits.catalog")];
}

/** Año de un lanzamiento para mostrar: el año guardado, o el de la fecha completa. */
export function releaseYear(row: { firstReleaseYear: number | null; firstReleaseDate: string | null }): string | null {
  if (row.firstReleaseYear) return String(row.firstReleaseYear);
  return row.firstReleaseDate ? row.firstReleaseDate.slice(0, 4) : null;
}

/** Une las partes no vacías con " · ". */
export function joinParts(...parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}
