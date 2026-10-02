// Interpretación de las respuestas de Wikimedia (openspec: enrich-artist-profile, capability
// `artist-wikimedia-enrichment`). Funciones puras: la escritura vive en
// src/services/catalog/artist-wikimedia.ts.

import type { CommonsImageInfoResponse, WDClaim, WDEntity, WPExtractResponse } from "./types";

/**
 * Valores de un claim, sin los "desaprobados": los de rango "preferido" si hay; si no, los
 * vigentes (sin fecha de fin, calificador P582) antes que los históricos. Evita, p. ej., que
 * Londres salga como parte del Imperio romano.
 */
function claimValues(entity: WDEntity | undefined, property: string): unknown[] {
  const claims = (entity?.claims?.[property] ?? []).filter((c: WDClaim) => c.rank !== "deprecated");
  const preferred = claims.filter((c) => c.rank === "preferred");
  const current = claims.filter((c) => !c.qualifiers?.P582);
  const ordered = preferred.length > 0 ? preferred : [...current, ...claims.filter((c) => !current.includes(c))];
  return ordered.map((c) => c.mainsnak.datavalue?.value).filter((v) => v !== undefined && v !== null);
}

/** Nombre del archivo de Commons de la propiedad de imagen (P18). */
export function photoFileOf(entity: WDEntity | undefined): string | null {
  const value = claimValues(entity, "P18")[0];
  return typeof value === "string" && value.trim() ? value : null;
}

function entityIdValue(value: unknown): string | null {
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return null;
}

/**
 * Lugar de nacimiento (P19) de una persona o de formación (P740) de un grupo. Con el tipo
 * todavía desconocido (stub), se prueba primero el de nacimiento.
 */
export function placeIdOf(entity: WDEntity | undefined, artistType: string): string | null {
  const properties = artistType === "person" ? ["P19"] : artistType === "group" ? ["P740"] : ["P19", "P740"];
  for (const property of properties) {
    const id = entityIdValue(claimValues(entity, property)[0]);
    if (id) return id;
  }
  return null;
}

/**
 * Géneros (P136) de un artista o un álbum como QIDs, en el orden de Wikidata y sin repetidos
 * (openspec: add-genre-taxonomy, design D6). Misma selección que el resto de la ficha: los de
 * rango preferido si hay; si no, los normales (los vigentes primero); nunca los obsoletos.
 */
export function genreIdsOf(entity: WDEntity | undefined): string[] {
  const ids = claimValues(entity, "P136").map(entityIdValue).filter((id): id is string => id !== null);
  return [...new Set(ids)];
}

/** País (P17) de un lugar. */
export function countryIdOf(place: WDEntity | undefined): string | null {
  return entityIdValue(claimValues(place, "P17")[0]);
}

export function labelOf(entity: WDEntity | undefined, lang: "es" | "en"): string | null {
  return entity?.labels?.[lang]?.value ?? null;
}

/** "Viña del Mar, Chile"; sin repetir el país si el lugar es el propio país. */
export function composePlaceLabel(place: string | null, country: string | null): string | null {
  if (!place) return null;
  if (!country || country === place) return place;
  return `${place}, ${country}`;
}

export interface WikipediaSummary {
  title: string;
  summary: string;
  url: string;
}

/** Introducción del artículo; null si la página no existe o no tiene texto. */
export function summaryOf(response: WPExtractResponse): WikipediaSummary | null {
  const page = response.query?.pages?.[0];
  const text = page?.extract?.replace(/​/g, "").trim();
  if (!page || page.missing || !text || !page.fullurl) return null;
  return { title: page.title, summary: text, url: page.fullurl };
}

export interface AcceptedPhoto {
  url: string;
  file: string;
  author: string | null;
  license: string;
  licenseUrl: string | null;
  sourceUrl: string;
}

export type PhotoDecision =
  | { status: "accepted"; photo: AcceptedPhoto }
  /** El archivo ya no existe en Commons. */
  | { status: "missing" }
  /** La licencia no es libre o no se declara. */
  | { status: "rejected"; license: string | null };

/**
 * Licencias libres permitidas: dominio público, CC0 y CC BY / CC BY-SA en cualquier versión.
 * Se rechazan NC (no comercial) y ND (sin derivadas), y lo que no se reconoce.
 */
export function isAllowedLicense(license: string): boolean {
  const normalized = license.trim().toLowerCase();
  if (/\b(nc|nd)\b/.test(normalized)) return false;
  return /^(public domain|pd\b|cc0|cc[ -]by([ -]sa)?\b)/.test(normalized);
}

const HTML_ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

/** Autor en texto plano: los metadatos de Commons vienen con HTML (enlaces al usuario). */
export function plainText(html: string | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 200) : null;
}

/** Decide si la foto de Commons se puede usar y arma su crédito. */
export function decidePhoto(fileName: string, response: CommonsImageInfoResponse): PhotoDecision {
  const page = response.query?.pages?.[0];
  const info = page?.imageinfo?.[0];
  if (!page || page.missing || !info) return { status: "missing" };

  const meta = info.extmetadata ?? {};
  const license = meta.LicenseShortName?.value?.trim() ?? null;
  const nonFree = (meta.NonFree?.value ?? "").trim().toLowerCase();
  if (!license || (nonFree !== "" && nonFree !== "false") || !isAllowedLicense(license)) {
    return { status: "rejected", license };
  }
  const url = info.thumburl ?? info.url;
  if (!url || !info.descriptionurl) return { status: "missing" };
  return {
    status: "accepted",
    photo: {
      url,
      file: fileName,
      author: plainText(meta.Artist?.value),
      license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      sourceUrl: info.descriptionurl,
    },
  };
}
