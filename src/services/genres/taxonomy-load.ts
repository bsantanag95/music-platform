import { inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { genre, genreFamilyMember, genreRelation, type GenreRelationKind } from "@/db/schema";
import type { TaxonomyFile } from "./taxonomy-build";

// Carga idempotente de `data/genres/taxonomy.json` (openspec: add-genre-taxonomy, design D2).
// Todo en una transacción: los géneros se insertan o actualizan por MBID solo si algo cambió
// (así una segunda carga no toca ni `updated_at`); relaciones y pertenencias se ajustan por
// diferencia; un género que ya no viene en el archivo queda `hidden` (no se borra: lo pueden
// referenciar semillas, URLs o identidades).

export interface LoadStats {
  inserted: number;
  updated: number;
  hidden: number;
  relationsAdded: number;
  relationsRemoved: number;
  membersAdded: number;
  membersRemoved: number;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const CHUNK = 500;
const chunks = <T>(items: T[]) => Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => items.slice(i * CHUNK, (i + 1) * CHUNK));

const RELATION_FIELDS: Record<GenreRelationKind, "subgenreOf" | "fusionOf" | "influencedBy"> = {
  subgenre_of: "subgenreOf",
  fusion_of: "fusionOf",
  influenced_by: "influencedBy",
};

/** Clave de una fila para comparar conjuntos. */
const key = (...parts: string[]) => parts.join("|");

async function upsertGenres(tx: Tx, file: TaxonomyFile) {
  const before = new Map((await tx.select({ mbid: genre.mbid }).from(genre)).map((r) => [r.mbid, true]));
  let changed = 0;
  for (const part of chunks(file.genres)) {
    const rows = await tx
      .insert(genre)
      .values(
        part.map((g) => ({
          mbid: g.mbid,
          slug: g.slug,
          name: g.name,
          nameEs: g.nameEs,
          wikidataId: g.wikidataId,
          kind: g.kind,
        })),
      )
      .onConflictDoUpdate({
        target: genre.mbid,
        set: {
          slug: sql`excluded.slug`,
          name: sql`excluded.name`,
          nameEs: sql`excluded.name_es`,
          wikidataId: sql`excluded.wikidata_id`,
          kind: sql`excluded.kind`,
        },
        setWhere: sql`(${genre.slug}, ${genre.name}, ${genre.nameEs}, ${genre.wikidataId}, ${genre.kind})
          IS DISTINCT FROM (excluded.slug, excluded.name, excluded.name_es, excluded.wikidata_id, excluded.kind)`,
      })
      .returning({ mbid: genre.mbid });
    changed += rows.length;
  }
  const inserted = file.genres.filter((g) => !before.has(g.mbid)).length;
  return { inserted, updated: changed - inserted };
}

async function hideRetired(tx: Tx, file: TaxonomyFile) {
  const mbids = file.genres.map((g) => g.mbid);
  const rows = await tx
    .update(genre)
    .set({ kind: "hidden" })
    .where(sql`${notInArray(genre.mbid, mbids)} AND ${genre.kind} <> 'hidden'`)
    .returning({ id: genre.id });
  return rows.length;
}

async function syncRelations(tx: Tx, file: TaxonomyFile, idByMbid: Map<string, string>) {
  const wanted = new Map<string, { genreId: string; relatedGenreId: string; kind: GenreRelationKind }>();
  for (const g of file.genres) {
    for (const [kind, field] of Object.entries(RELATION_FIELDS) as [GenreRelationKind, keyof typeof g][]) {
      for (const related of g[field] as string[]) {
        const genreId = idByMbid.get(g.mbid)!;
        const relatedGenreId = idByMbid.get(related);
        if (!relatedGenreId) throw new Error(`relación hacia un MBID que no está en el archivo: ${related}`);
        wanted.set(key(genreId, relatedGenreId, kind), { genreId, relatedGenreId, kind });
      }
    }
  }
  const current = await tx.select().from(genreRelation);
  const currentKeys = new Set(current.map((r) => key(r.genreId, r.relatedGenreId, r.kind)));
  const toRemove = current.filter((r) => !wanted.has(key(r.genreId, r.relatedGenreId, r.kind)));
  const toAdd = [...wanted.entries()].filter(([k]) => !currentKeys.has(k)).map(([, r]) => r);

  for (const r of toRemove) {
    await tx
      .delete(genreRelation)
      .where(sql`${genreRelation.genreId} = ${r.genreId} AND ${genreRelation.relatedGenreId} = ${r.relatedGenreId} AND ${genreRelation.kind} = ${r.kind}`);
  }
  for (const part of chunks(toAdd)) await tx.insert(genreRelation).values(part);
  return { relationsAdded: toAdd.length, relationsRemoved: toRemove.length };
}

async function syncMembers(tx: Tx, file: TaxonomyFile, idByMbid: Map<string, string>) {
  const wanted = new Map<string, { genreId: string; familyKey: string }>();
  for (const g of file.genres) {
    const genreId = idByMbid.get(g.mbid)!;
    for (const familyKey of g.families) wanted.set(key(genreId, familyKey), { genreId, familyKey });
  }
  const current = await tx.select().from(genreFamilyMember);
  const currentKeys = new Set(current.map((m) => key(m.genreId, m.familyKey)));
  const toRemove = current.filter((m) => !wanted.has(key(m.genreId, m.familyKey)));
  const toAdd = [...wanted.entries()].filter(([k]) => !currentKeys.has(k)).map(([, m]) => m);

  for (const m of toRemove) {
    await tx
      .delete(genreFamilyMember)
      .where(sql`${genreFamilyMember.genreId} = ${m.genreId} AND ${genreFamilyMember.familyKey} = ${m.familyKey}`);
  }
  for (const part of chunks(toAdd)) await tx.insert(genreFamilyMember).values(part);
  return { membersAdded: toAdd.length, membersRemoved: toRemove.length };
}

/** Aplica el archivo de taxonomía a la base. Idempotente. */
export async function loadTaxonomy(file: TaxonomyFile): Promise<LoadStats> {
  return db.transaction(async (tx) => {
    const { inserted, updated } = await upsertGenres(tx, file);
    const hidden = await hideRetired(tx, file);
    const mbids = file.genres.map((g) => g.mbid);
    const ids = new Map<string, string>();
    for (const part of chunks(mbids)) {
      for (const row of await tx.select({ id: genre.id, mbid: genre.mbid }).from(genre).where(inArray(genre.mbid, part))) {
        ids.set(row.mbid, row.id);
      }
    }
    const relations = await syncRelations(tx, file, ids);
    const members = await syncMembers(tx, file, ids);
    return { inserted, updated, hidden, ...relations, ...members };
  });
}
