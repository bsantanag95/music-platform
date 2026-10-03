import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appUser,
  collectionEntry,
  genre,
  listenEntry,
  rating,
  releaseGroup,
  releaseGroupEffectiveGenre,
  releaseGroupGenreScore,
  releaseGroupGenreVote,
} from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { hasActiveRestriction } from "@/services/auth/authorization";
import { MIN_VOTERS_FOR_COUNTS, rankGenres, type GenreRank } from "./rank";
import { GENRE_SLUG_PATTERN } from "./slug";

// Votos de la comunidad sobre los géneros de un álbum (openspec: add-genre-votes, capabilities
// `genre-votes` y `genre-vote-panel`). Un voto es +1 / -1; votar un género que el álbum no tiene
// lo propone. El puntaje lo calcula la vista `release_group_genre_score` (semilla + votos).

/** Tope de géneros votados por persona y álbum. */
export const MAX_VOTES_PER_ALBUM = 8;

export type VoteValue = 1 | -1;

/** Por qué una persona no puede votar un álbum (la interfaz lo explica). */
export type VoteBlockReason = "signed_out" | "deactivated" | "suspended" | "no_interaction";

export type VoteAccess = { canVote: true } | { canVote: false; reason: VoteBlockReason };

/** La persona valoró, escuchó (diario) o coleccionó el álbum. */
async function hasInteractedWithAlbum(userId: string, releaseGroupId: string): Promise<boolean> {
  const result = await db.execute<{ found: boolean }>(sql`
    SELECT (
      EXISTS (SELECT 1 FROM ${rating} WHERE ${rating.userId} = ${userId} AND ${rating.releaseGroupId} = ${releaseGroupId})
      OR EXISTS (SELECT 1 FROM ${listenEntry} WHERE ${listenEntry.userId} = ${userId} AND ${listenEntry.releaseGroupId} = ${releaseGroupId})
      OR EXISTS (SELECT 1 FROM ${collectionEntry} WHERE ${collectionEntry.userId} = ${userId} AND ${collectionEntry.releaseGroupId} = ${releaseGroupId})
    ) AS found
  `);
  return Boolean(result[0]?.found);
}

/** Si la persona puede votar los géneros de ese álbum, con el motivo cuando no. */
export async function getVoteAccess(userId: string | null, releaseGroupId: string): Promise<VoteAccess> {
  if (!userId) return { canVote: false, reason: "signed_out" };
  const [user] = await db.select({ deactivatedAt: appUser.deactivatedAt }).from(appUser).where(eq(appUser.id, userId)).limit(1);
  if (!user || user.deactivatedAt) return { canVote: false, reason: "deactivated" };
  if (await hasActiveRestriction(userId, "social_activity")) return { canVote: false, reason: "suspended" };
  if (!(await hasInteractedWithAlbum(userId, releaseGroupId))) return { canVote: false, reason: "no_interaction" };
  return { canVote: true };
}

function assertAccess(access: VoteAccess): void {
  if (access.canVote) return;
  if (access.reason === "suspended") {
    throw new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "La cuenta tiene una suspensión social activa");
  }
  if (access.reason === "deactivated") {
    throw new ApiError("PERMISSION_DENIED", 403, "La cuenta está desactivada");
  }
  throw new ApiError(
    "GENRE_VOTE_NO_INTERACTION",
    403,
    "Para votar los géneros hay que haber valorado, escuchado o coleccionado el álbum",
  );
}

async function loadTarget(releaseGroupId: string, slug: string) {
  if (!isValidUuid(releaseGroupId)) throw new ApiError("VALIDATION_ERROR", 400, "El álbum no es válido");
  const normalized = slug.trim().toLowerCase();
  if (!GENRE_SLUG_PATTERN.test(normalized) || normalized.length > 120) {
    throw new ApiError("VALIDATION_ERROR", 400, "El género no es válido");
  }
  const [album] = await db.select({ id: releaseGroup.id }).from(releaseGroup).where(eq(releaseGroup.id, releaseGroupId)).limit(1);
  if (!album) throw new ApiError("ALBUM_NOT_FOUND", 404, "El álbum no existe");
  const [found] = await db
    .select({ id: genre.id, kind: genre.kind })
    .from(genre)
    .where(eq(genre.slug, normalized))
    .limit(1);
  if (!found) throw new ApiError("GENRE_NOT_FOUND", 404, "El género no existe");
  // Descriptores y ocultos no se votan: son parte de la ficha del álbum, no su estilo.
  if (found.kind !== "style") throw new ApiError("VALIDATION_ERROR", 400, "Ese género no se puede votar");
  return { releaseGroupId, genreId: found.id };
}

/** Crea o cambia el voto de la persona sobre un género del álbum. */
export async function castGenreVote(userId: string, releaseGroupId: string, slug: string, value: number): Promise<void> {
  if (value !== 1 && value !== -1) throw new ApiError("VALIDATION_ERROR", 400, "El voto debe ser 1 o -1");
  const target = await loadTarget(releaseGroupId, slug);
  assertAccess(await getVoteAccess(userId, releaseGroupId));

  await db.transaction(async (tx) => {
    // Serializa los votos de la misma persona en el mismo álbum: sin esto dos peticiones
    // simultáneas podrían saltarse el tope.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${userId}:${releaseGroupId}`}, 0))`);
    const others = await tx
      .select({ id: releaseGroupGenreVote.id })
      .from(releaseGroupGenreVote)
      .where(
        and(
          eq(releaseGroupGenreVote.userId, userId),
          eq(releaseGroupGenreVote.releaseGroupId, releaseGroupId),
          ne(releaseGroupGenreVote.genreId, target.genreId),
        ),
      );
    if (others.length >= MAX_VOTES_PER_ALBUM) {
      throw new ApiError("VALIDATION_ERROR", 400, `Se pueden votar como máximo ${MAX_VOTES_PER_ALBUM} géneros por álbum`);
    }
    await tx
      .insert(releaseGroupGenreVote)
      .values({ userId, releaseGroupId, genreId: target.genreId, value })
      .onConflictDoUpdate({
        target: [releaseGroupGenreVote.userId, releaseGroupGenreVote.releaseGroupId, releaseGroupGenreVote.genreId],
        set: { value },
      });
  });
}

/** Retira el voto de la persona (idempotente: sin voto no hace nada). */
export async function removeGenreVote(userId: string, releaseGroupId: string, slug: string): Promise<void> {
  const target = await loadTarget(releaseGroupId, slug);
  await db
    .delete(releaseGroupGenreVote)
    .where(
      and(
        eq(releaseGroupGenreVote.userId, userId),
        eq(releaseGroupGenreVote.releaseGroupId, target.releaseGroupId),
        eq(releaseGroupGenreVote.genreId, target.genreId),
      ),
    );
}

export interface AlbumGenreVote {
  slug: string;
  name: string;
  nameEs: string | null;
  inherited: boolean;
  score: number;
  rank: GenreRank;
  /** Votos a favor y en contra: solo con suficientes votantes distintos (`showCounts`). */
  up: number | null;
  down: number | null;
  /** Voto propio (solo con sesión). */
  mine: VoteValue | null;
}

export interface AlbumGenreVotes {
  genres: AlbumGenreVote[];
  showCounts: boolean;
  /** Solo con sesión: si puede votar y, cuando no, por qué. */
  access: VoteAccess;
}

/**
 * Géneros de estilo del álbum con su puntaje, rango y, con sesión, el voto propio y el acceso a
 * votar. Los géneros que la persona votó negativamente y ya no son efectivos se incluyen para que
 * pueda ver y retirar su voto. Las cifras de votos se omiten con menos de MIN_VOTERS_FOR_COUNTS
 * votantes distintos.
 */
export async function getAlbumGenreVotes(releaseGroupId: string, viewerId: string | null): Promise<AlbumGenreVotes> {
  const [effective, voterRow, mineRows, access] = await Promise.all([
    db
      .select({
        genreId: genre.id,
        slug: genre.slug,
        name: genre.name,
        nameEs: genre.nameEs,
        inherited: releaseGroupEffectiveGenre.inherited,
        score: releaseGroupEffectiveGenre.score,
      })
      .from(releaseGroupEffectiveGenre)
      .innerJoin(genre, eq(genre.id, releaseGroupEffectiveGenre.genreId))
      .where(and(eq(releaseGroupEffectiveGenre.releaseGroupId, releaseGroupId), eq(genre.kind, "style")))
      .orderBy(asc(releaseGroupEffectiveGenre.position)),
    db.execute<{ voters: number }>(sql`
      SELECT COUNT(DISTINCT v.user_id)::int AS voters
      FROM release_group_genre_vote v
      JOIN app_user au ON au.id = v.user_id AND au.deactivated_at IS NULL
      WHERE v.release_group_id = ${releaseGroupId}
    `),
    viewerId
      ? db
          .select({
            genreId: releaseGroupGenreVote.genreId,
            value: releaseGroupGenreVote.value,
            slug: genre.slug,
            name: genre.name,
            nameEs: genre.nameEs,
          })
          .from(releaseGroupGenreVote)
          .innerJoin(genre, eq(genre.id, releaseGroupGenreVote.genreId))
          .where(and(eq(releaseGroupGenreVote.userId, viewerId), eq(releaseGroupGenreVote.releaseGroupId, releaseGroupId)))
      : Promise.resolve([]),
    getVoteAccess(viewerId, releaseGroupId),
  ]);

  const showCounts = (voterRow[0]?.voters ?? 0) >= MIN_VOTERS_FOR_COUNTS;
  const ids = effective.map((g) => g.genreId);
  const counts = new Map<string, { up: number; down: number }>();
  if (showCounts && ids.length > 0) {
    const rows = await db
      .select({ genreId: releaseGroupGenreScore.genreId, up: releaseGroupGenreScore.up, down: releaseGroupGenreScore.down })
      .from(releaseGroupGenreScore)
      .where(and(eq(releaseGroupGenreScore.releaseGroupId, releaseGroupId), inArray(releaseGroupGenreScore.genreId, ids)));
    for (const r of rows) counts.set(r.genreId, { up: r.up, down: r.down });
  }

  const mine = new Map<string, VoteValue>(mineRows.map((r) => [r.genreId, r.value === 1 ? 1 : -1]));
  const ranked = rankGenres(effective).map<AlbumGenreVote>((g) => ({
    slug: g.slug,
    name: g.name,
    nameEs: g.nameEs,
    inherited: g.inherited,
    score: g.score,
    rank: g.rank,
    up: counts.get(g.genreId)?.up ?? null,
    down: counts.get(g.genreId)?.down ?? null,
    mine: mine.get(g.genreId) ?? null,
  }));
  // Votos propios sobre géneros que no son efectivos (p. ej. un −1 a una semilla que quedó fuera).
  const shown = new Set(ids);
  for (const r of mineRows) {
    if (shown.has(r.genreId)) continue;
    ranked.push({
      slug: r.slug,
      name: r.name,
      nameEs: r.nameEs,
      inherited: false,
      score: 0,
      rank: "other",
      up: null,
      down: null,
      mine: r.value === 1 ? 1 : -1,
    });
  }
  return { genres: ranked, showCounts, access };
}
