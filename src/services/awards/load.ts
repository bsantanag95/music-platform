import { and, eq, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  artist,
  award,
  awardCategory,
  awardCategoryEdition,
  awardCeremony,
  awardNomination,
  recording,
  releaseGroup,
} from "@/db/schema";
import { ingestCredits } from "@/services/catalog/ingest-discography";
import { upsertArtistStubsFromSearch } from "@/services/catalog/ingest-artist";
import { findOrIngestRecording } from "@/services/catalog/ingest-recording";
import { upsertReleaseGroupStub } from "@/services/catalog/ingest-release-group";
import type { AwardFiles, CeremonyEntry } from "./curation-files";
import { isLinkable, nomineeText, type NomineeSeed } from "./curation-schema";

// Carga idempotente de los archivos de premios (openspec: add-music-awards, design D4, ADR 0032). El JSON es la
// fuente de verdad: lo que no está en los archivos se borra. Cada escritura compara antes de escribir, así que dos
// cargas seguidas no tocan ninguna fila. Los sujetos del catálogo se crean como stub desde la semilla del archivo,
// sin consultar MusicBrainz.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CeremonyLoadStats {
  file: string;
  categories: number;
  nominations: number;
  linked: number;
  unresolved: number;
  /** Categorías cuyas nominaciones se reemplazaron porque algo cambió. */
  rewritten: number;
}

export interface LoadStats {
  stubsCreated: number;
  ceremonies: CeremonyLoadStats[];
  ceremoniesRemoved: number;
  categoriesRemoved: number;
}

interface SubjectIds {
  releaseGroupId: string | null;
  recordingId: string | null;
  artistId: string | null;
  /** Disco ancla de una grabación (carátula y enlace "del álbum …"). */
  anchorReleaseGroupId: string | null;
}

const NO_SUBJECT: SubjectIds = { releaseGroupId: null, recordingId: null, artistId: null, anchorReleaseGroupId: null };

/** Release-group por MBID: lo crea como stub con sus créditos si falta. Devuelve su id. */
async function ensureReleaseGroup(mbid: string, seed: Extract<NomineeSeed, { kind: "release_group" }>, counter: { created: number }) {
  const [existing] = await db.select({ id: releaseGroup.id }).from(releaseGroup).where(eq(releaseGroup.mbid, mbid)).limit(1);
  if (existing) return existing.id;
  const row = await upsertReleaseGroupStub(mbid, seed.title, seed.category, seed.firstReleaseDate);
  // Mismo criterio que los stubs de búsqueda: el crédito viene gratis y le da artista al disco.
  if (seed.credits.length > 0) await ingestCredits(seed.credits, { releaseGroupId: row.id });
  counter.created++;
  return row.id;
}

/** Crea (si falta) la fila del catálogo para una semilla y devuelve su id. Sin requests a MusicBrainz. */
async function ensureSubject(mbid: string, seed: NomineeSeed, counter: { created: number }): Promise<SubjectIds> {
  if (seed.kind === "release_group") {
    return { ...NO_SUBJECT, releaseGroupId: await ensureReleaseGroup(mbid, seed, counter) };
  }
  if (seed.kind === "artist") {
    const [existing] = await db.select({ id: artist.id }).from(artist).where(eq(artist.mbid, mbid)).limit(1);
    if (existing) return { ...NO_SUBJECT, artistId: existing.id };
    const [row] = await upsertArtistStubsFromSearch([
      { mbid, name: seed.name, mbType: seed.mbType, disambiguation: seed.disambiguation ?? null },
    ]);
    if (!row) throw new Error(`No se pudo crear el artista ${mbid}`);
    counter.created++;
    return { ...NO_SUBJECT, artistId: row.id };
  }
  const anchorReleaseGroupId =
    seed.anchor && seed.anchorMbid ? await ensureReleaseGroup(seed.anchorMbid, seed.anchor, counter) : null;
  const [existing] = await db.select({ id: recording.id }).from(recording).where(eq(recording.mbid, mbid)).limit(1);
  if (existing) return { ...NO_SUBJECT, recordingId: existing.id, anchorReleaseGroupId };
  const row = await findOrIngestRecording({ mbid, title: seed.title, durationSec: seed.durationSec, credits: seed.credits });
  counter.created++;
  return { ...NO_SUBJECT, recordingId: row.id, anchorReleaseGroupId };
}

async function upsertCategories(tx: Tx, awardId: string, files: AwardFiles): Promise<{ ids: Map<string, string>; removed: number }> {
  const definitions = files.categories.categories;
  for (const c of definitions) {
    await tx
      .insert(awardCategory)
      .values({
        awardId,
        key: c.key,
        tier: c.tier,
        subjectKind: c.subject,
        honors: c.honors,
        nameEs: c.name.es,
        nameEn: c.name.en,
        sortOrder: c.order,
      })
      .onConflictDoUpdate({
        target: [awardCategory.awardId, awardCategory.key],
        set: {
          tier: sql`excluded.tier`,
          subjectKind: sql`excluded.subject_kind`,
          honors: sql`excluded.honors`,
          nameEs: sql`excluded.name_es`,
          nameEn: sql`excluded.name_en`,
          sortOrder: sql`excluded.sort_order`,
        },
        setWhere: sql`(${awardCategory.tier}, ${awardCategory.subjectKind}, ${awardCategory.honors}, ${awardCategory.nameEs}, ${awardCategory.nameEn}, ${awardCategory.sortOrder})
          IS DISTINCT FROM (excluded.tier, excluded.subject_kind, excluded.honors, excluded.name_es, excluded.name_en, excluded.sort_order)`,
      });
  }
  const rows = await tx.select({ id: awardCategory.id, key: awardCategory.key, predecessorId: awardCategory.predecessorId })
    .from(awardCategory)
    .where(eq(awardCategory.awardId, awardId));
  const ids = new Map(rows.map((r) => [r.key, r.id]));
  // Predecesoras en una segunda pasada: pueden apuntar a una categoría definida más abajo en el archivo.
  for (const c of definitions) {
    const id = ids.get(c.key)!;
    const predecessorId = c.predecessor ? (ids.get(c.predecessor) ?? null) : null;
    const current = rows.find((r) => r.id === id)?.predecessorId ?? null;
    if (current !== predecessorId) await tx.update(awardCategory).set({ predecessorId }).where(eq(awardCategory.id, id));
  }
  const keep = definitions.map((c) => c.key);
  const removed = await tx
    .delete(awardCategory)
    .where(and(eq(awardCategory.awardId, awardId), notInArray(awardCategory.key, keep)))
    .returning({ id: awardCategory.id });
  for (const key of [...ids.keys()]) if (!keep.includes(key)) ids.delete(key);
  return { ids, removed: removed.length };
}

interface DesiredNomination extends SubjectIds {
  won: boolean;
  nomineeText: string;
  creditText: string | null;
  sortOrder: number;
}

const nominationKey = (n: DesiredNomination) =>
  JSON.stringify([n.sortOrder, n.won, n.nomineeText, n.creditText, n.releaseGroupId, n.recordingId, n.artistId, n.anchorReleaseGroupId]);

async function loadCeremony(
  tx: Tx,
  awardId: string,
  categoryIds: Map<string, string>,
  entry: CeremonyEntry,
  subjects: Map<string, SubjectIds>,
): Promise<CeremonyLoadStats> {
  const data = entry.data;
  const [ceremony] = await tx
    .insert(awardCeremony)
    .values({ awardId, year: data.year, edition: data.edition, heldOn: data.heldOn })
    .onConflictDoUpdate({
      target: [awardCeremony.awardId, awardCeremony.year],
      set: { edition: sql`excluded.edition`, heldOn: sql`excluded.held_on` },
      setWhere: sql`(${awardCeremony.edition}, ${awardCeremony.heldOn}) IS DISTINCT FROM (excluded.edition, excluded.held_on)`,
    })
    .returning({ id: awardCeremony.id });
  const ceremonyId =
    ceremony?.id ??
    (await tx.select({ id: awardCeremony.id }).from(awardCeremony).where(and(eq(awardCeremony.awardId, awardId), eq(awardCeremony.year, data.year))))[0]!.id;

  const stats: CeremonyLoadStats = { file: entry.fileName, categories: data.categories.length, nominations: 0, linked: 0, unresolved: 0, rewritten: 0 };
  const editionIds: string[] = [];

  for (const category of data.categories) {
    const categoryId = categoryIds.get(category.key)!;
    await tx
      .insert(awardCategoryEdition)
      .values({ ceremonyId, categoryId, coverage: category.coverage })
      .onConflictDoUpdate({
        target: [awardCategoryEdition.ceremonyId, awardCategoryEdition.categoryId],
        set: { coverage: sql`excluded.coverage` },
        setWhere: sql`${awardCategoryEdition.coverage} IS DISTINCT FROM excluded.coverage`,
      });
    const [edition] = await tx
      .select({ id: awardCategoryEdition.id })
      .from(awardCategoryEdition)
      .where(and(eq(awardCategoryEdition.ceremonyId, ceremonyId), eq(awardCategoryEdition.categoryId, categoryId)));
    const editionId = edition!.id;
    editionIds.push(editionId);

    const desired: DesiredNomination[] = category.nominees.map((nominee, index) => {
      const ids = isLinkable(nominee.resolved) ? (subjects.get(nominee.resolved.mbid) ?? NO_SUBJECT) : NO_SUBJECT;
      if (ids === NO_SUBJECT) stats.unresolved++;
      else stats.linked++;
      return {
        ...ids,
        won: nominee.won,
        nomineeText: nomineeText(nominee),
        creditText: nominee.credits ?? null,
        sortOrder: index + 1,
      };
    });
    stats.nominations += desired.length;

    const current = await tx
      .select({
        sortOrder: awardNomination.sortOrder,
        won: awardNomination.won,
        nomineeText: awardNomination.nomineeText,
        creditText: awardNomination.creditText,
        releaseGroupId: awardNomination.releaseGroupId,
        recordingId: awardNomination.recordingId,
        artistId: awardNomination.artistId,
        anchorReleaseGroupId: awardNomination.anchorReleaseGroupId,
      })
      .from(awardNomination)
      .where(eq(awardNomination.categoryEditionId, editionId))
      .orderBy(awardNomination.sortOrder);
    const same = current.length === desired.length && current.every((row, i) => nominationKey(row) === nominationKey(desired[i]!));
    if (same) continue;

    // Nada referencia una nominación todavía: reemplazar la categoría completa es seguro (design D4).
    await tx.delete(awardNomination).where(eq(awardNomination.categoryEditionId, editionId));
    await tx.insert(awardNomination).values(desired.map((n) => ({ ...n, categoryEditionId: editionId })));
    stats.rewritten++;
  }

  // Categorías que ya no están en la ceremonia (su borrado arrastra las nominaciones).
  await tx
    .delete(awardCategoryEdition)
    .where(and(eq(awardCategoryEdition.ceremonyId, ceremonyId), notInArray(awardCategoryEdition.id, editionIds)));
  return stats;
}

/**
 * Carga un premio ya leído y validado (`readAward` sin errores). Primero crea los sujetos del catálogo que falten
 * (fuera de la transacción, con las funciones del catálogo) y después escribe el premio en una transacción.
 */
export async function loadAward(files: AwardFiles): Promise<LoadStats> {
  const counter = { created: 0 };
  const subjects = new Map<string, SubjectIds>();
  for (const { data } of files.ceremonies) {
    for (const category of data.categories) {
      for (const nominee of category.nominees) {
        if (!isLinkable(nominee.resolved) || subjects.has(nominee.resolved.mbid)) continue;
        subjects.set(nominee.resolved.mbid, await ensureSubject(nominee.resolved.mbid, nominee.resolved.seed, counter));
      }
    }
  }

  return db.transaction(async (tx) => {
    await tx.insert(award).values({ slug: files.slug }).onConflictDoNothing({ target: award.slug });
    const [awardRow] = await tx.select({ id: award.id }).from(award).where(eq(award.slug, files.slug));
    const awardId = awardRow!.id;

    const { ids, removed } = await upsertCategories(tx, awardId, files);
    const ceremonies: CeremonyLoadStats[] = [];
    for (const entry of files.ceremonies) ceremonies.push(await loadCeremony(tx, awardId, ids, entry, subjects));

    const years = files.ceremonies.map((c) => c.data.year);
    const gone = await tx
      .delete(awardCeremony)
      .where(and(eq(awardCeremony.awardId, awardId), years.length > 0 ? notInArray(awardCeremony.year, years) : undefined))
      .returning({ id: awardCeremony.id });

    return { stubsCreated: counter.created, ceremonies, ceremoniesRemoved: gone.length, categoriesRemoved: removed };
  });
}

