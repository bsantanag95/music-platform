import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, type ReleaseGroupRow } from "@/db/schema";

export type ReleaseGroupCategoryValue =
  | "studio"
  | "single_ep"
  | "compilation"
  | "live_other";

export interface ReleaseGroupStubInput {
  mbid: string;
  title: string;
  category: ReleaseGroupCategoryValue;
}

/**
 * Upsert "stub" de release-group: solo mbid + título + categoría, sin
 * tracklist ni créditos — la primera visita a `/album/<id>` ingiere el
 * resto. Espejo del patrón de `upsertArtistStub`: si el mbid ya existe,
 * devuelve la fila existente **sin sobrescribirla**.
 */
export async function upsertReleaseGroupStub(
  mbid: string,
  title: string,
  category: ReleaseGroupCategoryValue,
): Promise<ReleaseGroupRow> {
  const [existing] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.mbid, mbid))
    .limit(1);
  if (existing) return existing;

  const rows = await db
    .insert(releaseGroup)
    .values({ mbid, title, category })
    .onConflictDoNothing({ target: releaseGroup.mbid })
    .returning();

  const row = rows[0];
  if (row) return row;

  // Conflicto entre la lectura y el insert (carrera): la fila ya está, se relee.
  const [conflict] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.mbid, mbid))
    .limit(1);
  if (!conflict) throw new Error(`No se pudo resolver el release-group stub ${mbid}`);
  return conflict;
}

/**
 * Stub-multiple en una sola operación (INSERT ... ON CONFLICT DO NOTHING):
 * persiste los candidatos de una búsqueda que aún no existen localmente y
 * resuelve las filas de TODO el conjunto por mbid — las newly-insertadas y
 * las ya existentes, sin sobrescribir nunca una fila enriquecida.
 */
export async function upsertReleaseGroupStubs(
  stubs: ReleaseGroupStubInput[],
): Promise<ReleaseGroupRow[]> {
  if (stubs.length === 0) return [];

  await db
    .insert(releaseGroup)
    .values(stubs)
    .onConflictDoNothing({ target: releaseGroup.mbid });

  return db
    .select()
    .from(releaseGroup)
    .where(inArray(releaseGroup.mbid, stubs.map((stub) => stub.mbid)));
}
