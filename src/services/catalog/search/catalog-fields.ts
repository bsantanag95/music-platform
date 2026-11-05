// Campos de la búsqueda avanzada que solo conoce el catálogo (openspec: add-catalog-search-fields): período de
// actividad, rol de una persona, género de la taxonomía propia, premios y país del artista de un álbum. MusicBrainz no
// los indexa, así que una búsqueda con alguno se resuelve entera aquí, con todos sus criterios en SQL, paginada y con la
// cifra exacta, sin solicitudes a MusicBrainz ni stubs.
//
// Las condiciones se correlacionan con la consulta exterior por los literales "artist"."id" y "release_group"."id": en
// un SELECT sin joins Drizzle renderiza la columna sin tabla, ambigua dentro de un EXISTS (ver raw-sql en local-match).

import { and, asc, count, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { artist, award, releaseGroup, type ArtistRow, type ReleaseGroupRow } from "@/db/schema";
import { findStyleGenreBySlug, genreWithDescendants } from "../../genres/read";
import type { ArtistRole } from "./filters";
import { artistFilters, exactMatch, fuzzyMatch, releaseGroupFilters, type LocalReleaseGroupOptions } from "./local-match";
import type { ArtistQueryFilters } from "./mb-query";

/** Filas de un `db.execute` crudo (postgres-js devuelve el arreglo de filas). */
async function rowsOf<T>(query: SQL): Promise<T[]> {
  return (await db.execute(query)) as unknown as T[];
}

/** Resultados por página del modo solo catálogo. */
export const CATALOG_PAGE_SIZE = 25;

export interface ArtistCatalogFilters {
  activeFrom?: number;
  activeTo?: number;
  role?: ArtistRole;
  genre?: string;
  award?: string;
  awardWon?: boolean;
}

export interface AlbumCatalogFilters {
  genre?: string;
  award?: string;
  awardWon?: boolean;
  artistCountry?: string[];
}

/** Relaciones de personal que cuentan como "Producción o técnica". */
const PRODUCTION_RELATIONS = ["producer", "engineer", "mix", "recording", "programming", "arranger"];
/** Relaciones de personal que cuentan como "Músico invitado o de sesión". */
const MUSICIAN_RELATIONS = ["instrument", "vocal"];

/** Género visible y premio cargado, ya resueltos: un slug desconocido u oculto se ignora. */
export interface ResolvedCatalogFields {
  genreId: string | null;
  /** `any`, el slug de un premio cargado, o `null` si no hay campo o no existe. */
  award: string | null;
}

/** Premios que se pueden elegir en la búsqueda avanzada: competencias primero, luego salones de la fama. */
export async function listAwardOptions(): Promise<{ slug: string; kind: "competition" | "hall_of_fame" }[]> {
  return db
    .select({ slug: award.slug, kind: award.kind })
    .from(award)
    .orderBy(sql`(${award.kind} = 'hall_of_fame')`, asc(award.slug));
}

/** Algún campo del catálogo con valor. */
export function hasCatalogFields(fields: object): boolean {
  return Object.values(fields).some((value) => value !== undefined);
}

/** Valida el género y el premio contra la base (la lectura de la URL solo comprueba la forma). */
export async function resolveCatalogFields(fields: { genre?: string; award?: string }): Promise<ResolvedCatalogFields> {
  const [genreRow, awardRow] = await Promise.all([
    fields.genre ? findStyleGenreBySlug(fields.genre) : null,
    fields.award && fields.award !== "any"
      ? db.select({ slug: award.slug }).from(award).where(eq(award.slug, fields.award)).limit(1)
      : null,
  ]);
  return {
    genreId: genreRow?.id ?? null,
    award: fields.award === "any" ? "any" : (awardRow?.[0]?.slug ?? null),
  };
}

/** Quita del filtro lo que no se pudo resolver: así un campo inválido no deja la búsqueda en modo catálogo. */
export function withoutUnresolved<T extends { genre?: string; award?: string; awardWon?: boolean }>(
  fields: T,
  resolved: ResolvedCatalogFields,
): T {
  const next = { ...fields };
  if (!resolved.genreId) delete next.genre;
  if (!resolved.award) {
    delete next.award;
    delete next.awardWon;
  }
  return next;
}

// Casi todas las condiciones son semi-uniones NO correlacionadas (`id IN (SELECT …)`): Postgres las resuelve una vez y
// las cruza por hash (premios de artistas con EXISTS correlacionado tardaba 74 s en scratch). Actividad y músico van
// correlacionadas: se evalúan solo sobre las pocas filas que dejan las demás condiciones, y así cuestan menos.

/** Nominaciones de `slug` (o de cualquier premio con `any`); con `won`, ganadas (un salón de la fama cuenta como ganado). */
function nominations(slug: string, won: boolean): SQL {
  return sql`(
    SELECT n.artist_id, n.release_group_id, n.recording_id, n.anchor_release_group_id
    FROM award_nomination n
    JOIN award_category_edition ce ON ce.id = n.category_edition_id
    JOIN award_ceremony cer ON cer.id = ce.ceremony_id
    JOIN award aw ON aw.id = cer.award_id
    WHERE ${slug === "any" ? sql`TRUE` : sql`aw.slug = ${slug}`}
      AND ${won ? sql`(n.won OR aw.kind = 'hall_of_fame')` : sql`TRUE`}
  )`;
}

function ids(values: string[]): SQL {
  return sql.join(
    values.map((value) => sql`${value}::uuid`),
    sql`, `,
  );
}

function list(values: string[]): SQL {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

/**
 * Álbumes con el género `genreId` o un subgénero, con la misma regla que la vista `release_group_effective_genre`
 * (puntaje de votos y semillas; si no tiene, la herencia materializada del artista, ADR 0028) pero sobre las tablas de
 * base: la vista numera los géneros de cada álbum con una ventana sobre todo el catálogo y el filtro no la atraviesa
 * (rock: ~200 ms por la vista, la mitad así). Para filtrar no hace falta la posición.
 */
function albumsInGenreTree(genreId: string): SQL {
  const tree = genreWithDescendants(genreId);
  return sql`(
    SELECT sc.release_group_id FROM release_group_genre_score sc WHERE sc.score > 0 AND sc.genre_id IN ${tree}
    UNION
    SELECT ig.release_group_id FROM release_group_inherited_genre ig
    WHERE ig.genre_id IN ${tree}
      AND NOT EXISTS (
        SELECT 1 FROM release_group_genre_score sc2 WHERE sc2.release_group_id = ig.release_group_id AND sc2.score > 0
      )
  )`;
}

/** Algún disco como artista principal. */
const OWN_DISCS = sql`"artist"."id" IN (
  SELECT c.artist_id FROM credit c WHERE c.role = 'primary' AND c.release_group_id IS NOT NULL
)`;

/**
 * Solista y Otras personas en el modo solo catálogo (openspec: split-person-search-types). Solista: algún disco propio
 * (aquí solo cuenta lo que está en la base). Otras personas sin rol: sin discos propios y con alguna pertenencia o
 * crédito de personal; con rol, la condición del rol (`artistCatalogConditions`) basta, tenga o no discos propios.
 */
export function personKindConditions(
  artistType: ArtistQueryFilters["artistType"],
  { role, activeFrom, activeTo }: ArtistCatalogFilters,
): SQL[] {
  // La actividad ya sale de los discos propios: repetir la semi-unión sobre todos los créditos costaba ~200 ms.
  if (artistType === "solo") return activeFrom !== undefined || activeTo !== undefined ? [] : [OWN_DISCS];
  if (artistType !== "other" || role) return [];
  return [
    sql`"artist"."id" IN (SELECT m.person_id FROM membership m UNION SELECT p.artist_id FROM personnel_credit p)`,
    sql`NOT EXISTS (
      SELECT 1 FROM credit c WHERE c.artist_id = "artist"."id" AND c.role = 'primary' AND c.release_group_id IS NOT NULL
    )`,
  ];
}

/** Condiciones del catálogo sobre la tabla `artist`. */
export function artistCatalogConditions(
  { activeFrom, activeTo, role, awardWon }: ArtistCatalogFilters,
  resolved: ResolvedCatalogFields,
  currentYear: number = new Date().getUTCFullYear(),
): SQL[] {
  const conditions: SQL[] = [];
  if (activeFrom !== undefined || activeTo !== undefined) {
    // Primer al último disco propio, hasta hoy si no consta separado o fallecido; solo con la discografía explorada
    // (sin ella el primer disco puede ser cualquiera). Los discos marcados fuera de la discografía no cuentan.
    // Correlacionada a propósito: la guarda de discografía explorada la deja en unos cientos de filas.
    conditions.push(sql`"artist"."discography_synced_at" IS NOT NULL AND EXISTS (
      SELECT 1 FROM (
        SELECT min(rg.first_release_year) AS first_year, max(rg.first_release_year) AS last_year
        FROM credit c JOIN release_group rg ON rg.id = c.release_group_id
        WHERE c.artist_id = "artist"."id" AND c.role = 'primary' AND rg.discography_unlisted_at IS NULL
      ) span
      WHERE span.first_year <= ${activeTo ?? 2100}
        AND (CASE WHEN "artist"."life_ended" IS TRUE THEN span.last_year ELSE ${currentYear} END) >= ${activeFrom ?? 0}
    )`);
  }
  if (role === "member") conditions.push(sql`"artist"."id" IN (SELECT m.person_id FROM membership m)`);
  if (role === "producer") {
    conditions.push(sql`"artist"."id" IN (
      SELECT p.artist_id FROM personnel_credit p WHERE p.relation_type IN (${list(PRODUCTION_RELATIONS)})
    )`);
  }
  if (role === "musician") {
    // Instrumento o voz en un disco o una grabación donde no es artista principal.
    conditions.push(sql`EXISTS (
      SELECT 1 FROM personnel_credit p
      LEFT JOIN release r ON r.id = p.release_id
      WHERE p.artist_id = "artist"."id" AND p.relation_type IN (${list(MUSICIAN_RELATIONS)})
        AND NOT EXISTS (
          SELECT 1 FROM credit c
          WHERE c.artist_id = "artist"."id" AND c.role = 'primary'
            AND (c.release_group_id = r.release_group_id OR c.recording_id = p.recording_id)
        )
    )`);
  }
  if (resolved.genreId) {
    const tree = genreWithDescendants(resolved.genreId);
    conditions.push(sql`"artist"."id" IN (
      SELECT s.artist_id FROM artist_genre_seed s WHERE s.genre_id IN ${tree}
      UNION
      SELECT c.artist_id FROM credit c
      WHERE c.role = 'primary' AND c.release_group_id IN ${albumsInGenreTree(resolved.genreId)}
    )`);
  }
  if (resolved.award) {
    // Nominado como artista, o artista principal de un álbum o una grabación nominados.
    const nominated = nominations(resolved.award, awardWon ?? false);
    conditions.push(sql`"artist"."id" IN (
      SELECT n.artist_id FROM ${nominated} n WHERE n.artist_id IS NOT NULL
      UNION
      SELECT c.artist_id FROM ${nominated} n JOIN credit c ON c.release_group_id = n.release_group_id AND c.role = 'primary'
      UNION
      SELECT c.artist_id FROM ${nominated} n JOIN credit c ON c.recording_id = n.recording_id AND c.role = 'primary'
    )`);
  }
  return conditions;
}

/** Condiciones del catálogo sobre la tabla `release_group`. */
export function albumCatalogConditions(
  { artistCountry, awardWon }: AlbumCatalogFilters,
  resolved: ResolvedCatalogFields,
): SQL[] {
  const conditions: SQL[] = [];
  if (resolved.genreId) {
    conditions.push(sql`"release_group"."id" IN ${albumsInGenreTree(resolved.genreId)}`);
  }
  if (artistCountry?.length) {
    conditions.push(sql`"release_group"."id" IN (
      SELECT c.release_group_id FROM credit c JOIN artist a ON a.id = c.artist_id
      WHERE c.role = 'primary' AND c.release_group_id IS NOT NULL AND a.country IN (${list(artistCountry)})
    )`);
  }
  if (resolved.award) {
    // El álbum nominado, o el disco donde está anclada una grabación nominada.
    const nominated = nominations(resolved.award, awardWon ?? false);
    conditions.push(sql`"release_group"."id" IN (
      SELECT n.release_group_id FROM ${nominated} n WHERE n.release_group_id IS NOT NULL
      UNION
      SELECT n.anchor_release_group_id FROM ${nominated} n WHERE n.anchor_release_group_id IS NOT NULL
    )`);
  }
  return conditions;
}

/**
 * Nivel de coincidencia en SQL, para paginar con nombre o título: exacto → palabra completa → prefijo → resto, como
 * `matchTier`; dentro de cada nivel, similitud.
 */
function tierOrder(column: SQL, text: string): SQL[] {
  return [
    sql`CASE
      WHEN search_key(${column}) = search_key(${text}) THEN 0
      WHEN (' ' || search_key(${column}) || ' ') LIKE ('% ' || search_key(${text}) || ' %') THEN 1
      WHEN search_key(${column}) LIKE (search_key(${text}) || '%') THEN 2
      ELSE 3 END`,
    sql`similarity(search_normalize(${column}), search_normalize(${text})) DESC`,
  ];
}

export interface CatalogPage<T> {
  rows: T[];
  total: number;
  nextOffset: number | null;
}

function page<T>(rows: T[], total: number, offset: number): CatalogPage<T> {
  const next = offset + rows.length;
  return { rows, total, nextOffset: rows.length > 0 && next < total ? next : null };
}

/** Artistas solo del catálogo: todos los criterios en SQL, orden estable, 25 por página y cifra exacta. */
export async function catalogArtistPage(
  text: string,
  { exact, ...filters }: ArtistQueryFilters,
  catalog: ArtistCatalogFilters,
  resolved: ResolvedCatalogFields,
  offset: number,
): Promise<CatalogPage<ArtistRow>> {
  const where = and(
    ...(text ? [exact ? exactMatch(artist.name, text) : fuzzyMatch(artist.name, text)] : []),
    ...artistFilters(filters),
    ...personKindConditions(filters.artistType, catalog),
    ...artistCatalogConditions(catalog, resolved),
  );
  const order = text
    ? [...tierOrder(sql`"artist"."name"`, text), asc(artist.id)]
    : [sql`"artist"."discography_synced_at" IS NULL`, asc(artist.name), asc(artist.id)];
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(artist)
      .where(where)
      .orderBy(...order)
      .limit(CATALOG_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(artist).where(where),
  ]);
  return page(rows, totals[0]?.total ?? 0, offset);
}

/** Álbumes solo del catálogo: todos los criterios en SQL, orden estable, 25 por página y cifra exacta. */
export async function catalogAlbumPage(
  text: string,
  { exact, ...filters }: Omit<LocalReleaseGroupOptions, "limit">,
  catalog: AlbumCatalogFilters,
  resolved: ResolvedCatalogFields,
  offset: number,
): Promise<CatalogPage<ReleaseGroupRow>> {
  const where = and(
    ...(text ? [exact ? exactMatch(releaseGroup.title, text) : fuzzyMatch(releaseGroup.title, text)] : []),
    ...releaseGroupFilters(filters),
    ...albumCatalogConditions(catalog, resolved),
  );
  const order = text
    ? [...tierOrder(sql`"release_group"."title"`, text), asc(releaseGroup.id)]
    : [
        sql`("release_group"."category" = 'studio') DESC`,
        sql`"release_group"."first_release_year" ASC NULLS LAST`,
        asc(releaseGroup.id),
      ];
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(releaseGroup)
      .where(where)
      .orderBy(...order)
      .limit(CATALOG_PAGE_SIZE)
      .offset(offset),
    db.select({ total: count() }).from(releaseGroup).where(where),
  ]);
  return page(rows, totals[0]?.total ?? 0, offset);
}

/** Período de actividad por artista (solo los de discografía explorada); `to` `null` = sigue en actividad. */
export async function activeSpans(rows: ArtistRow[]): Promise<Map<string, { from: number; to: number | null }>> {
  const explored = rows.filter((row) => row.discographySyncedAt !== null);
  if (explored.length === 0) return new Map();
  const spans = await rowsOf<{ artist_id: string; first_year: number | null; last_year: number | null }>(sql`
    SELECT c.artist_id, min(rg.first_release_year) AS first_year, max(rg.first_release_year) AS last_year
    FROM credit c JOIN release_group rg ON rg.id = c.release_group_id
    WHERE c.role = 'primary' AND rg.discography_unlisted_at IS NULL
      AND c.artist_id IN (${ids(explored.map((row) => row.id))})
    GROUP BY c.artist_id
  `);
  const ended = new Map(explored.map((row) => [row.id, row.lifeEnded === true]));
  const result = new Map<string, { from: number; to: number | null }>();
  for (const span of spans) {
    if (span.first_year === null) continue;
    result.set(span.artist_id, {
      from: Number(span.first_year),
      to: ended.get(span.artist_id) ? Number(span.last_year) : null,
    });
  }
  return result;
}

/**
 * "Integrante de": por persona, la banda del catálogo con más actividad (luego la de discografía explorada y por
 * nombre) y cuántas más tiene. Una consulta por página; no filtra ni reordena.
 */
export async function memberOf(rows: ArtistRow[]): Promise<Map<string, { id: string; name: string; more: number }>> {
  const people = rows.filter((row) => row.type === "person").map((row) => row.id);
  if (people.length === 0) return new Map();
  // La banda que más se reconoce: más seguidores en la plataforma, después más discos propios en el catálogo.
  const bands = await rowsOf<{ person_id: string; id: string; name: string; total: number }>(sql`
    SELECT DISTINCT ON (m.person_id) m.person_id, g.id, g.name, count(*) OVER (PARTITION BY m.person_id) AS total
    FROM (SELECT DISTINCT person_id, group_id FROM membership WHERE person_id IN (${ids(people)})) m
    JOIN artist g ON g.id = m.group_id
    ORDER BY m.person_id,
      (SELECT count(*) FROM artist_follow f WHERE f.artist_id = g.id) DESC,
      (SELECT count(*) FROM credit c WHERE c.artist_id = g.id AND c.role = 'primary' AND c.release_group_id IS NOT NULL) DESC,
      g.name
  `);
  return new Map(bands.map((band) => [band.person_id, { id: band.id, name: band.name, more: Number(band.total) - 1 }]));
}

/** Por álbum: el género que coincidió (el de mejor posición dentro del árbol pedido). */
export async function matchedGenres(
  albumIds: string[],
  genreId: string,
): Promise<Map<string, { slug: string; name: string; nameEs: string | null }>> {
  if (albumIds.length === 0) return new Map();
  const rows = await rowsOf<{ release_group_id: string; slug: string; name: string; name_es: string | null }>(sql`
    SELECT DISTINCT ON (e.release_group_id) e.release_group_id, g.slug, g.name, g.name_es
    FROM release_group_effective_genre e JOIN genre g ON g.id = e.genre_id
    WHERE e.release_group_id IN (${ids(albumIds)})
      AND e.genre_id IN ${genreWithDescendants(genreId)}
    ORDER BY e.release_group_id, e.position
  `);
  return new Map(rows.map((row) => [row.release_group_id, { slug: row.slug, name: row.name, nameEs: row.name_es }]));
}

/** Por álbum: el país de su artista principal, prefiriendo uno de `countries`. */
export async function primaryArtistCountries(albumIds: string[], countries: string[]): Promise<Map<string, string>> {
  if (albumIds.length === 0) return new Map();
  const rows = await rowsOf<{ release_group_id: string; country: string }>(sql`
    SELECT DISTINCT ON (c.release_group_id) c.release_group_id, a.country
    FROM credit c JOIN artist a ON a.id = c.artist_id
    WHERE c.release_group_id IN (${ids(albumIds)})
      AND c.role = 'primary' AND a.country IS NOT NULL
    ORDER BY c.release_group_id, (a.country IN (${list(countries)})) DESC, c.position
  `);
  return new Map(rows.map((row) => [row.release_group_id, row.country]));
}

