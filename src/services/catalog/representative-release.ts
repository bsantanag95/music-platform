import type { MBReleaseSummary } from "../musicbrainz/types";

/**
 * Selección de la **edición representativa** de un release-group
 * (openspec: canonicalize-release-group / capability `album-edition-selection`).
 *
 * `pickRepresentativeRelease` es una función pura: la misma lista de ediciones
 * produce siempre la misma elección, sin importar el orden en que MusicBrainz
 * las devuelva. La ingesta (`findOrIngestTracklist`) y el script de
 * re-canonicalización comparten esta función.
 */

// Marcadores de edición NO estándar. Si aparecen en el título o en la
// `disambiguation` de una edición, esa edición pierde el criterio 3 frente a
// una edición corriente. Lista fija (design.md OQ3): vive junto a la función.
const NON_STANDARD_EDITION_MARKERS = [
  "deluxe",
  "super deluxe",
  "expanded",
  "expanded edition",
  "anniversary",
  "remaster",
  "remastered",
  "special edition",
  "collector",
  "collectors",
  "legacy edition",
  "tour edition",
  "bonus track",
  "bonus tracks",
];

// Países que representan "la edición como salió al mundo" antes que una
// variante regional concreta. XW = Worldwide, XE = Europe.
const PRIMARY_COUNTRIES = ["XW", "US", "GB", "XE"];

// Packagings que denotan una edición de coleccionista / caja, no la edición
// corriente del disco.
const NON_STANDARD_PACKAGINGS = ["box", "slim jewel case with slipcase"];

function hasNonStandardMarker(release: MBReleaseSummary): boolean {
  const haystack = `${release.title ?? ""} ${release.disambiguation ?? ""}`.toLowerCase();
  return NON_STANDARD_EDITION_MARKERS.some((marker) => haystack.includes(marker));
}

function isPrimaryCountry(release: MBReleaseSummary): boolean {
  return release.country !== undefined && PRIMARY_COUNTRIES.includes(release.country);
}

function hasStandardPackaging(release: MBReleaseSummary): boolean {
  if (release.packaging === undefined || release.packaging === null) return false;
  const p = release.packaging.toLowerCase();
  return !NON_STANDARD_PACKAGINGS.some((bad) => p.includes(bad));
}

/**
 * Clave de fecha comparable como string. Rellena fechas parciales para que
 * `'1973'` (inicio de año) ordene antes que `'1973-03-24'`, y una edición sin
 * fecha ordene después de cualquiera con fecha.
 */
function dateSortKey(date: string | undefined): string {
  if (!date) return "9999-99-99";
  const [y, m, d] = date.split("-");
  return `${(y ?? "9999").padStart(4, "0")}-${(m ?? "00").padStart(2, "0")}-${(d ?? "00").padStart(2, "0")}`;
}

function totalTrackCount(release: MBReleaseSummary): number | null {
  if (!release.media?.length) return null;
  let sum = 0;
  let known = false;
  for (const medium of release.media) {
    if (typeof medium["track-count"] === "number") {
      sum += medium["track-count"];
      known = true;
    }
  }
  return known ? sum : null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Devuelve la edición representativa según los 7 criterios ordenados de la
 * capability `album-edition-selection`, o `null` si la lista está vacía.
 */
export function pickRepresentativeRelease(
  releases: readonly MBReleaseSummary[],
): MBReleaseSummary | null {
  if (releases.length === 0) return null;

  // Criterio 6: mediana de recuentos de pistas de las ediciones oficiales
  // (o de todas si no hay ninguna oficial con recuento conocido). Si ningún
  // recuento es conocido, el criterio se degrada a "no aplica" (design.md D2).
  const officialCounts = releases
    .filter((r) => r.status === "Official")
    .map(totalTrackCount)
    .filter((c): c is number => c !== null);
  const fallbackCounts = releases
    .map(totalTrackCount)
    .filter((c): c is number => c !== null);
  const referenceMedian = median(officialCounts.length ? officialCounts : fallbackCounts);

  const scored = releases.map((release) => {
    const trackCount = totalTrackCount(release);
    return {
      release,
      isOfficial: release.status === "Official" ? 0 : 1,
      dateKey: dateSortKey(release.date),
      nonStandard: hasNonStandardMarker(release) ? 1 : 0,
      notPrimaryCountry: isPrimaryCountry(release) ? 0 : 1,
      notStandardPackaging: hasStandardPackaging(release) ? 0 : 1,
      trackDistance:
        referenceMedian !== null && trackCount !== null
          ? Math.abs(trackCount - referenceMedian)
          : Number.POSITIVE_INFINITY,
      mbid: release.id,
    };
  });

  scored.sort(
    (a, b) =>
      a.isOfficial - b.isOfficial ||
      a.dateKey.localeCompare(b.dateKey) ||
      a.nonStandard - b.nonStandard ||
      a.notPrimaryCountry - b.notPrimaryCountry ||
      a.notStandardPackaging - b.notStandardPackaging ||
      a.trackDistance - b.trackDistance ||
      a.mbid.localeCompare(b.mbid),
  );

  return scored[0]!.release;
}

/**
 * Etiqueta de edición derivada de la edición elegida:
 * `disambiguation` → sufijo de edición del título → `"standard"`.
 * Nunca devuelve `"original"` de forma incondicional (ese era el bug).
 */
export function deriveEditionLabel(release: MBReleaseSummary): string {
  const disambiguation = release.disambiguation?.trim();
  if (disambiguation) return disambiguation;

  // Sufijo entre paréntesis al final del título: "Album (Deluxe Edition)".
  const parenSuffix = release.title?.match(/\(([^)]+)\)\s*$/)?.[1]?.trim();
  if (parenSuffix) return parenSuffix;

  return "standard";
}
