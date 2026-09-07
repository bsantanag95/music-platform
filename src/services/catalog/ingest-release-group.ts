import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { releaseGroup, type ReleaseGroupRow } from "@/db/schema";
import { normalizeReleaseDate, yearFromMbDate } from "../musicbrainz/mappers";

export type ReleaseGroupCategoryValue =
  | "studio"
  | "single_ep"
  | "compilation"
  | "live_other";

export interface ReleaseGroupStubInput {
  mbid: string;
  title: string;
  category: ReleaseGroupCategoryValue;
  /**
   * `first-release-date` de MusicBrainz cuando la búsqueda la trae. Solo se
   * usa para poblar la fecha canónica de un stub NUEVO; nunca sobrescribe una
   * fila ya enriquecida (openspec: canonicalize-release-group).
   */
  firstReleaseDate?: string;
  /**
   * Año aproximado (mínimo de las fechas de aparición) cuando no hay
   * `first-release-date` exacta — lo usa la ingesta de grabación suelta.
   * Se ignora si `firstReleaseDate` ya aporta un año.
   */
  firstReleaseYear?: number;
}

/**
 * Traduce el `first-release-date` de MusicBrainz (y un año aproximado
 * opcional) a las columnas `first_release_date` / `first_release_year` de
 * `release_group`, con la tolerancia a precisión parcial de
 * `release-date-precision`. Compartido por la ingesta de stubs, la de
 * discografía y la de tracklist.
 */
export function canonicalDateValues(input: {
  firstReleaseDate?: string;
  firstReleaseYear?: number;
}): { firstReleaseDate?: string; firstReleaseYear?: number } {
  const date = normalizeReleaseDate(input.firstReleaseDate);
  const year = yearFromMbDate(input.firstReleaseDate) ?? input.firstReleaseYear ?? null;
  return {
    ...(date !== null ? { firstReleaseDate: date } : {}),
    ...(year !== null ? { firstReleaseYear: year } : {}),
  };
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
  firstReleaseDate?: string,
): Promise<ReleaseGroupRow> {
  const [existing] = await db
    .select()
    .from(releaseGroup)
    .where(eq(releaseGroup.mbid, mbid))
    .limit(1);
  if (existing) return existing;

  const rows = await db
    .insert(releaseGroup)
    .values({ mbid, title, category, ...canonicalDateValues({ firstReleaseDate }) })
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
    .values(
      stubs.map(({ mbid, title, category, firstReleaseDate, firstReleaseYear }) => ({
        mbid,
        title,
        category,
        ...canonicalDateValues({ firstReleaseDate, firstReleaseYear }),
      })),
    )
    .onConflictDoNothing({ target: releaseGroup.mbid });

  return db
    .select()
    .from(releaseGroup)
    .where(inArray(releaseGroup.mbid, stubs.map((stub) => stub.mbid)));
}
