import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistLocalizedText, type ArtistLocalizedTextRow, type ArtistRow } from "@/db/schema";
import { wikimedia, type WikiLanguage } from "../wikimedia/client";
import {
  composePlaceLabel,
  countryIdOf,
  decidePhoto,
  labelOf,
  photoFileOf,
  placeIdOf,
  summaryOf,
  type AcceptedPhoto,
  type WikipediaSummary,
} from "../wikimedia/mappers";
import type { WDEntity } from "../wikimedia/types";
import { isStale } from "./artist-profile";

// Enriquecimiento del perfil de artista desde Wikidata, Wikipedia y Commons (openspec:
// enrich-artist-profile, capability `artist-wikimedia-enrichment`, ADR 0021). Se llega a
// Wikidata solo desde `artist.wikidata_id`, que sale de la relación `wikidata` de
// MusicBrainz. Cada paso (textos, lugar, foto) decide por separado: un fallo en uno conserva
// lo guardado antes para ese dato y no descarta los demás.

const LANGUAGES: WikiLanguage[] = ["es", "en"];

type TextPatch = Partial<Pick<ArtistLocalizedTextRow, "description" | "summary" | "summaryTitle" | "summaryUrl" | "placeLabel">>;

/** Cambios de la foto: `undefined` = conservar la guardada; `null` = quitarla. */
type PhotoChange = AcceptedPhoto | null | undefined;

export interface WikimediaEnrichment {
  texts: Record<WikiLanguage, TextPatch>;
  photo: PhotoChange;
  /** Pasos que fallaron (sus datos se conservan). */
  failures: string[];
}

export type WikimediaSyncResult =
  | { status: "skipped" }
  | { status: "no-wikidata" }
  | ({ status: "enriched" } & WikimediaEnrichment);

async function tryStep<T>(name: string, failures: string[], step: () => Promise<T>): Promise<T | undefined> {
  try {
    return await step();
  } catch (error) {
    failures.push(name);
    console.warn(`[wikimedia] paso "${name}" falló`, error instanceof Error ? error.message : error);
    return undefined;
  }
}

async function fetchSummaries(entity: WDEntity, failures: string[]): Promise<Record<WikiLanguage, WikipediaSummary | null | undefined>> {
  const result = {} as Record<WikiLanguage, WikipediaSummary | null | undefined>;
  for (const lang of LANGUAGES) {
    const title = entity.sitelinks?.[`${lang}wiki`]?.title;
    // Sin artículo en ese idioma: no hay resumen (la lectura usa el del otro idioma).
    result[lang] = title
      ? await tryStep(`resumen ${lang}`, failures, async () => summaryOf(await wikimedia.getIntroExtract(lang, title)))
      : null;
  }
  return result;
}

async function fetchPlaceLabels(entity: WDEntity, artistType: string, failures: string[]) {
  const placeId = placeIdOf(entity, artistType);
  if (!placeId) return { es: null, en: null };
  return tryStep("lugar", failures, async () => {
    const place = (await wikimedia.getEntities([placeId], ["labels", "claims"])).entities?.[placeId];
    const countryId = countryIdOf(place);
    const country = countryId ? (await wikimedia.getEntities([countryId], ["labels"])).entities?.[countryId] : undefined;
    return {
      es: composePlaceLabel(labelOf(place, "es") ?? labelOf(place, "en"), labelOf(country, "es") ?? labelOf(country, "en")),
      en: composePlaceLabel(labelOf(place, "en") ?? labelOf(place, "es"), labelOf(country, "en") ?? labelOf(country, "es")),
    };
  });
}

async function fetchPhoto(entity: WDEntity, blocked: boolean, failures: string[]): Promise<PhotoChange> {
  // Retiro a pedido: mientras esté marcado, no se asigna ninguna foto.
  if (blocked) return null;
  const file = photoFileOf(entity);
  if (!file) return null;
  return tryStep("foto", failures, async () => {
    const decision = decidePhoto(file, await wikimedia.getImageInfo(file));
    return decision.status === "accepted" ? decision.photo : null;
  });
}

/** Reúne lo que Wikimedia tiene para el artista, sin escribir. */
export async function fetchWikimediaEnrichment(
  current: Pick<ArtistRow, "wikidataId" | "type" | "photoBlockedAt">,
): Promise<WikimediaEnrichment | null> {
  if (!current.wikidataId) return null;
  const qid = current.wikidataId;
  // Sin la entidad no hay nada que decidir: el error se propaga y se conserva todo.
  const entity = (await wikimedia.getEntities([qid], ["claims", "descriptions", "sitelinks"])).entities?.[qid];
  if (!entity || entity.missing !== undefined) return { texts: { es: {}, en: {} }, photo: undefined, failures: ["entidad"] };

  const failures: string[] = [];
  const summaries = await fetchSummaries(entity, failures);
  const places = await fetchPlaceLabels(entity, current.type, failures);
  const photo = await fetchPhoto(entity, current.photoBlockedAt !== null, failures);

  const texts = {} as Record<WikiLanguage, TextPatch>;
  for (const lang of LANGUAGES) {
    const patch: TextPatch = { description: entity.descriptions?.[lang]?.value ?? null };
    const summary = summaries[lang];
    if (summary !== undefined) {
      patch.summary = summary?.summary ?? null;
      patch.summaryTitle = summary?.title ?? null;
      patch.summaryUrl = summary?.url ?? null;
    }
    if (places !== undefined) patch.placeLabel = places[lang];
    texts[lang] = patch;
  }
  return { texts, photo, failures };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function saveEnrichment(tx: Tx, artistId: string, enrichment: WikimediaEnrichment, now: Date) {
  const { photo } = enrichment;
  const photoColumns =
    photo === undefined
      ? {}
      : photo === null
        ? { photoUrl: null, photoFile: null, photoAuthor: null, photoLicense: null, photoLicenseUrl: null, photoSourceUrl: null }
        : {
            photoUrl: photo.url,
            photoFile: photo.file,
            photoAuthor: photo.author,
            photoLicense: photo.license,
            photoLicenseUrl: photo.licenseUrl,
            photoSourceUrl: photo.sourceUrl,
          };
  await tx.update(artist).set({ ...photoColumns, wikimediaSyncedAt: now }).where(eq(artist.id, artistId));

  for (const lang of LANGUAGES) {
    const patch = enrichment.texts[lang];
    if (Object.keys(patch).length === 0) continue;
    await tx
      .insert(artistLocalizedText)
      .values({ artistId, locale: lang, ...patch })
      .onConflictDoUpdate({ target: [artistLocalizedText.artistId, artistLocalizedText.locale], set: patch });
  }
}

/**
 * Enriquece un artista desde Wikimedia bajo un candado por artista. Se omite si está al día
 * (30 días) salvo `force`. Un artista sin `wikidata_id` queda marcado como sincronizado sin
 * datos de Wikimedia. Si falla la entidad de Wikidata, el error se propaga y no se escribe
 * nada: el artista queda pendiente para la próxima visita.
 */
export async function enrichArtistFromWikimedia(
  artistId: string,
  {
    dryRun = false,
    force = false,
    wikidataId,
  }: {
    dryRun?: boolean;
    force?: boolean;
    /** Solo simulación: el id que la ficha obtuvo sin guardarlo todavía. */
    wikidataId?: string | null;
  } = {},
): Promise<WikimediaSyncResult> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`artist-wikimedia:${artistId}`}, 0))`);
    const [current] = await tx.select().from(artist).where(eq(artist.id, artistId)).limit(1);
    if (!current?.mbid) return { status: "skipped" };
    if (!force && !isStale(current.wikimediaSyncedAt)) return { status: "skipped" };

    const now = new Date();
    const source = dryRun && wikidataId !== undefined ? { ...current, wikidataId } : current;
    const enrichment = await fetchWikimediaEnrichment(source);
    if (!enrichment) {
      if (!dryRun) await tx.update(artist).set({ wikimediaSyncedAt: now }).where(eq(artist.id, artistId));
      return { status: "no-wikidata" };
    }
    if (!dryRun) await saveEnrichment(tx, artistId, enrichment, now);
    return { status: "enriched", ...enrichment };
  });
}

/** Quita la foto de un artista y la bloquea (retiro a pedido), o quita el bloqueo. */
export async function setArtistPhotoBlocked(artistId: string, blocked: boolean): Promise<ArtistRow | null> {
  const rows = await db
    .update(artist)
    .set(
      blocked
        ? {
            photoBlockedAt: new Date(),
            photoUrl: null,
            photoFile: null,
            photoAuthor: null,
            photoLicense: null,
            photoLicenseUrl: null,
            photoSourceUrl: null,
          }
        : // Al desbloquear se fuerza un nuevo enriquecimiento en la próxima visita.
          { photoBlockedAt: null, wikimediaSyncedAt: null },
    )
    .where(eq(artist.id, artistId))
    .returning();
  return rows[0] ?? null;
}
