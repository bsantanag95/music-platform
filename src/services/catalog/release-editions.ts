import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { label, release, releaseEdition, releaseEditionLabel, releaseGroup } from "@/db/schema";
import { pickRepresentativeRelease } from "./representative-release";
import { musicbrainz, RELEASE_BROWSE_PAGE_SIZE } from "../musicbrainz/client";
import { normalizeReleaseDate, yearFromMbDate } from "../musicbrainz/mappers";
import type { MBReleaseBrowseByGroupItem } from "../musicbrainz/types";

// Resumen de TODAS las ediciones de un álbum (openspec: enrich-album-editions-and-credits,
// capability `album-editions`). El lookup del release-group con `inc=releases` devuelve
// como máximo 25 ediciones; el browse paginado las trae todas, con sellos y formatos.

/** Tope de páginas del browse en la primera ingesta (500 ediciones). */
export const MAX_EDITION_PAGES = 5;

export interface FetchedReleaseEditions {
  editions: MBReleaseBrowseByGroupItem[];
  /** `first-release-date` del release-group embebido en las ediciones. */
  firstReleaseDate: string | undefined;
  /** Total que informa MusicBrainz (puede superar lo obtenido si se alcanzó el tope). */
  total: number;
  truncated: boolean;
}

/**
 * Pide las páginas del browse hasta completar el total o alcanzar el tope. Por encima del
 * tope sigue con lo obtenido y lo registra: la edición representativa se elige entre esas.
 */
export async function fetchReleaseEditions(
  releaseGroupMbid: string,
  maxPages = MAX_EDITION_PAGES,
): Promise<FetchedReleaseEditions> {
  const editions: MBReleaseBrowseByGroupItem[] = [];
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const response = await musicbrainz.browseReleasesByReleaseGroup(
      releaseGroupMbid,
      page * RELEASE_BROWSE_PAGE_SIZE,
    );
    total = response["release-count"];
    editions.push(...response.releases);
    if (response.releases.length === 0 || editions.length >= total) break;
  }

  const truncated = editions.length < total;
  if (truncated) {
    console.warn(
      `[release-editions] ${releaseGroupMbid}: ${total} ediciones, se usan las primeras ${editions.length} (tope de ${maxPages} páginas)`,
    );
  }

  return {
    editions,
    firstReleaseDate: editions.find((e) => e["release-group"]?.["first-release-date"])?.["release-group"]?.[
      "first-release-date"
    ],
    total,
    truncated,
  };
}

export interface MappedReleaseEdition {
  mbid: string;
  title: string;
  disambiguation: string | null;
  status: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  country: string | null;
  packaging: string | null;
  formats: string[];
  mediumCount: number;
  trackCount: number | null;
  labels: { mbid: string | null; name: string | null; catalogNumber: string | null }[];
}

/** Mapea una edición del browse a los valores del resumen. Pura. */
export function mapReleaseEdition(item: MBReleaseBrowseByGroupItem): MappedReleaseEdition {
  const media = [...(item.media ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const counts = media.map((m) => m["track-count"]);
  const trackCount = counts.some((n) => typeof n === "number")
    ? counts.reduce<number>((sum, n) => sum + (n ?? 0), 0)
    : null;

  return {
    mbid: item.id,
    title: item.title ?? "",
    disambiguation: item.disambiguation || null,
    status: item.status ?? null,
    releaseDate: normalizeReleaseDate(item.date),
    releaseYear: yearFromMbDate(item.date),
    country: item.country ?? null,
    packaging: item.packaging ?? null,
    formats: media.map((m) => m.format ?? "").filter(Boolean),
    mediumCount: media.length,
    trackCount,
    labels: (item["label-info"] ?? [])
      .map((info) => ({
        mbid: info.label?.id ?? null,
        name: info.label?.name ?? null,
        catalogNumber: info["catalog-number"]?.trim() || null,
      }))
      .filter((l) => l.mbid !== null || l.catalogNumber !== null),
  };
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Guarda el resumen de ediciones de un álbum de forma idempotente (upsert por `mbid` de
 * edición y de sello; los sellos de cada edición se reemplazan) y marca el álbum como
 * sincronizado. Todo en una transacción.
 */
export async function saveReleaseEditions(
  releaseGroupId: string,
  items: MBReleaseBrowseByGroupItem[],
): Promise<void> {
  await db.transaction((tx) => writeReleaseEditions(tx, releaseGroupId, items));
}

async function writeReleaseEditions(
  tx: Transaction,
  releaseGroupId: string,
  items: MBReleaseBrowseByGroupItem[],
): Promise<void> {
  const mapped = items.map(mapReleaseEdition);
  if (mapped.length > 0) {
    const editionRows = await tx
      .insert(releaseEdition)
      .values(
        mapped.map((edition) => ({
          releaseGroupId,
          mbid: edition.mbid,
          title: edition.title,
          disambiguation: edition.disambiguation,
          status: edition.status,
          releaseDate: edition.releaseDate,
          releaseYear: edition.releaseYear,
          country: edition.country,
          packaging: edition.packaging,
          formats: edition.formats,
          mediumCount: edition.mediumCount,
          trackCount: edition.trackCount,
        })),
      )
      .onConflictDoUpdate({
        target: releaseEdition.mbid,
        set: {
          releaseGroupId,
          title: sql`excluded.title`,
          disambiguation: sql`excluded.disambiguation`,
          status: sql`excluded.status`,
          releaseDate: sql`excluded.release_date`,
          releaseYear: sql`excluded.release_year`,
          country: sql`excluded.country`,
          packaging: sql`excluded.packaging`,
          formats: sql`excluded.formats`,
          mediumCount: sql`excluded.medium_count`,
          trackCount: sql`excluded.track_count`,
        },
      })
      .returning({ id: releaseEdition.id, mbid: releaseEdition.mbid });
    const editionIdByMbid = new Map(editionRows.map((row) => [row.mbid, row.id]));

    const labelsByMbid = new Map<string, string>();
    for (const edition of mapped) {
      for (const l of edition.labels) if (l.mbid && l.name) labelsByMbid.set(l.mbid, l.name);
    }
    const labelIdByMbid = new Map<string, string>();
    if (labelsByMbid.size > 0) {
      const labelRows = await tx
        .insert(label)
        .values([...labelsByMbid].map(([mbid, name]) => ({ mbid, name })))
        .onConflictDoUpdate({ target: label.mbid, set: { name: sql`excluded.name` } })
        .returning({ id: label.id, mbid: label.mbid });
      for (const row of labelRows) labelIdByMbid.set(row.mbid, row.id);
    }

    const editionIds = [...editionIdByMbid.values()];
    await tx.delete(releaseEditionLabel).where(inArray(releaseEditionLabel.releaseEditionId, editionIds));
    const labelLinks = mapped.flatMap((edition) => {
      const releaseEditionId = editionIdByMbid.get(edition.mbid);
      if (!releaseEditionId) return [];
      return edition.labels.map((l, position) => ({
        releaseEditionId,
        labelId: l.mbid ? (labelIdByMbid.get(l.mbid) ?? null) : null,
        catalogNumber: l.catalogNumber,
        position,
      }));
    });
    const validLinks = labelLinks.filter((link) => link.labelId !== null || link.catalogNumber !== null);
    if (validLinks.length > 0) await tx.insert(releaseEditionLabel).values(validLinks);
  }

  await tx
    .update(releaseGroup)
    .set({ editionsSyncedAt: new Date() })
    .where(eq(releaseGroup.id, releaseGroupId));
}

export type EditionsSyncResult =
  | { status: "skipped" }
  | {
      status: "synced";
      editionCount: number;
      currentRepresentativeMbid: string | null;
      chosenRepresentativeMbid: string | null;
      /** Con todas las ediciones se elegiría otra representativa (solo se informa). */
      representativeWouldChange: boolean;
    };

/**
 * Sincroniza el resumen de ediciones de un álbum ya ingerido cuyo resumen está pendiente
 * (`editions_synced_at` nulo). El lock por release-group cubre también la llamada a
 * MusicBrainz y la marca se relee dentro de la transacción: dos visitas simultáneas no
 * piden dos veces. NUNCA cambia la edición representativa: si la elección sobre el
 * conjunto completo difiere, solo lo informa (corregirla es tarea de
 * `scripts/recanonicalize-release-group.ts`).
 */
export async function syncReleaseEditions(
  releaseGroupId: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): Promise<EditionsSyncResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`editions:${releaseGroupId}`}, 0))`);
    const [rg] = await tx.select().from(releaseGroup).where(eq(releaseGroup.id, releaseGroupId)).limit(1);
    if (!rg?.mbid || rg.editionsSyncedAt) return { status: "skipped" };

    const { editions } = await fetchReleaseEditions(rg.mbid);
    const [current] = await tx
      .select({ mbid: release.mbid })
      .from(release)
      .where(and(eq(release.releaseGroupId, releaseGroupId), eq(release.isRepresentative, true)))
      .limit(1);
    const chosen = pickRepresentativeRelease(editions);
    const currentRepresentativeMbid = current?.mbid ?? null;
    const chosenRepresentativeMbid = chosen?.id ?? null;
    const representativeWouldChange =
      chosenRepresentativeMbid !== null && chosenRepresentativeMbid !== currentRepresentativeMbid;

    if (representativeWouldChange) {
      console.warn(
        `[release-editions] ${releaseGroupId}: con todas las ediciones la representativa sería ${chosenRepresentativeMbid} (hoy ${currentRepresentativeMbid}); no se cambia`,
      );
    }
    if (!dryRun) await writeReleaseEditions(tx, releaseGroupId, editions);

    return {
      status: "synced",
      editionCount: editions.length,
      currentRepresentativeMbid,
      chosenRepresentativeMbid,
      representativeWouldChange,
    };
  });
}
