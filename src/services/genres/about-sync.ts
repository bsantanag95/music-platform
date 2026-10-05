import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { genre, genreLocalizedText, type GenreLocalizedTextRow, type GenreRow } from "@/db/schema";
import { wikimedia, type WikiLanguage } from "../wikimedia/client";
import { summaryOf, type WikipediaSummary } from "../wikimedia/mappers";
import type { WDEntity } from "../wikimedia/types";
import { GENRE_ABOUT_REFRESH_MS } from "./constants";

// Sincronización del texto "Sobre el género" desde Wikidata y Wikipedia (openspec:
// redesign-genre-page, capability `genre-about`, ADR 0027). Se llega a Wikidata SOLO por
// `genre.wikidata_id` (la declaración P8052 atada al MBID), nunca buscando por nombre. Cada idioma
// decide por separado: un extracto que falla conserva el texto anterior de ese idioma y no descarta
// el otro; una entidad que no se puede leer no escribe nada y deja al género pendiente.

const LANGUAGES: WikiLanguage[] = ["es", "en"];

type TextPatch = Partial<Pick<GenreLocalizedTextRow, "description" | "summary" | "summaryTitle" | "summaryUrl">>;

export interface GenreAboutEnrichment {
  texts: Record<WikiLanguage, TextPatch>;
  /** Pasos que fallaron (su dato anterior se conserva). */
  failures: string[];
}

export type GenreAboutSyncResult =
  | { status: "skipped" }
  | { status: "no-wikidata" }
  | { status: "missing-entity" }
  | ({ status: "enriched" } & GenreAboutEnrichment);

/** Nunca sincronizado o con más de 30 días. */
export function isAboutStale(syncedAt: Date | null, now = Date.now()): boolean {
  return syncedAt === null || now - syncedAt.getTime() > GENRE_ABOUT_REFRESH_MS;
}

/** Reúne lo que Wikimedia tiene del género, sin escribir. `null` si la entidad no existe. */
export async function fetchGenreAboutEnrichment(wikidataId: string): Promise<GenreAboutEnrichment | null> {
  // Sin la entidad no hay nada que decidir: un error de red se propaga y no se escribe nada.
  const entity: WDEntity | undefined = (await wikimedia.getEntities([wikidataId], ["descriptions", "sitelinks"])).entities?.[wikidataId];
  if (!entity || entity.missing !== undefined) return null;

  const failures: string[] = [];
  const texts = {} as Record<WikiLanguage, TextPatch>;
  for (const lang of LANGUAGES) {
    const patch: TextPatch = { description: entity.descriptions?.[lang]?.value ?? null };
    const title = entity.sitelinks?.[`${lang}wiki`]?.title;
    if (!title) {
      // Sin artículo en ese idioma: no hay resumen (la lectura usa el del otro idioma).
      Object.assign(patch, { summary: null, summaryTitle: null, summaryUrl: null });
    } else {
      try {
        const summary: WikipediaSummary | null = summaryOf(await wikimedia.getIntroExtract(lang, title));
        Object.assign(patch, {
          summary: summary?.summary ?? null,
          summaryTitle: summary?.title ?? null,
          summaryUrl: summary?.url ?? null,
        });
      } catch (error) {
        failures.push(`resumen ${lang}`);
        console.warn(`[genre-about] el resumen ${lang} falló`, error instanceof Error ? error.message : error);
      }
    }
    texts[lang] = patch;
  }
  return { texts, failures };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function saveEnrichment(tx: Tx, genreId: string, enrichment: GenreAboutEnrichment) {
  for (const lang of LANGUAGES) {
    const patch = enrichment.texts[lang];
    if (Object.keys(patch).length === 0) continue;
    await tx
      .insert(genreLocalizedText)
      .values({ genreId, locale: lang, ...patch })
      .onConflictDoUpdate({ target: [genreLocalizedText.genreId, genreLocalizedText.locale], set: patch });
  }
}

/**
 * Sincroniza el texto de un género bajo un candado por género. Se omite si está al día (30 días) salvo
 * `force`. Un género sin `wikidata_id` queda marcado como sincronizado sin texto. Si falla la lectura de
 * la entidad el error se propaga y no se escribe nada (ni la marca): el género queda pendiente para la
 * próxima visita. Solo se sincronizan los géneros de estilo.
 */
export async function enrichGenreFromWikimedia(
  genreId: string,
  { dryRun = false, force = false }: { dryRun?: boolean; force?: boolean } = {},
): Promise<GenreAboutSyncResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`genre-wikimedia:${genreId}`}, 0))`);
    const [current]: GenreRow[] = await tx.select().from(genre).where(eq(genre.id, genreId)).limit(1);
    if (!current || current.kind !== "style") return { status: "skipped" };
    if (!force && !isAboutStale(current.wikimediaSyncedAt)) return { status: "skipped" };

    const now = new Date();
    if (!current.wikidataId) {
      if (!dryRun) await tx.update(genre).set({ wikimediaSyncedAt: now }).where(eq(genre.id, genreId));
      return { status: "no-wikidata" };
    }

    const enrichment = await fetchGenreAboutEnrichment(current.wikidataId);
    if (!enrichment) {
      // La entidad ya no existe (borrada o fusionada): se conserva el texto y no se reintenta en cada visita.
      if (!dryRun) await tx.update(genre).set({ wikimediaSyncedAt: now }).where(eq(genre.id, genreId));
      return { status: "missing-entity" };
    }
    if (!dryRun) {
      await saveEnrichment(tx, genreId, enrichment);
      await tx.update(genre).set({ wikimediaSyncedAt: now }).where(eq(genre.id, genreId));
    }
    return { status: "enriched", ...enrichment };
  });
}
