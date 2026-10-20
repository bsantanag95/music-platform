// "Con más conversación esta semana" — riel de `/activity` (redesign-activity-page, D10). Álbumes con al menos
// `TRENDING_MIN_PEOPLE` personas distintas que, en los últimos `TRENDING_WINDOW_DAYS` días, los valoraron, comentaron
// (solo comentarios raíz) o reseñaron, con las mismas reglas de visibilidad que "Recientes": perfil público, cuenta
// activa, contenido no oculto por moderación y sin bloqueo con el lector.
//
// La métrica es real y declarada (personas en una ventana fija), no una popularidad fabricada; el umbral evita
// destacar a una sola persona que comenta muchas veces. Si no hay álbumes que lo cumplan, el riel no se completa con
// otros.
//
// Caché: la parte que no depende del lector (los candidatos con sus participantes) se lee una vez cada
// `TRENDING_TTL_MS`. El bloqueo se aplica por lector sobre ese resultado, así que un lector puede ver menos álbumes
// (nunca otros que no estaban entre los candidatos).

import { and, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUser, comment, rating, releaseGroup, review, userBlock } from "@/db/schema";
import { rootCommentsOnly } from "@/services/social/comment-roots";
import { activeUserCondition } from "@/services/auth/account-status";
import { PRIMARY_ARTIST_ID_SQL, PRIMARY_ARTIST_SQL } from "@/services/feed/feed";
import { createTtlCache, type TtlCache } from "@/lib/ttl-cache";

export const TRENDING_WINDOW_DAYS = 7;
export const TRENDING_MIN_PEOPLE = 2;
export const TRENDING_LIMIT = 5;
export const TRENDING_TTL_MS = 10 * 60 * 1000;
// Candidatos que guarda la caché: más que el tope, para que el filtro de bloqueo de un lector todavía deje álbumes.
const TRENDING_CANDIDATES = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TrendingConversation {
  releaseGroupId: string;
  title: string;
  coverThumbUrl: string | null;
  artistName: string | null;
  artistId: string | null;
  people: number;
}

interface Candidate extends Omit<TrendingConversation, "people"> {
  // Personas distintas que participaron, con su actividad más reciente: el bloqueo se resta por lector.
  participants: { userId: string; lastAt: number }[];
}

// Mismo filtro de autor que "Recientes" (`listCommunityActivity`): perfil público y cuenta activa.
const PUBLIC_AUTHOR = and(eq(appUser.profileVisibility, "public"), activeUserCondition());

async function queryCandidates(now: number): Promise<Candidate[]> {
  // Condiciones de drizzle (`gte`), que serializan el `Date`; con `sql` crudo habría que pasarlo como ISO.
  const since = new Date(now - TRENDING_WINDOW_DAYS * DAY_MS);

  const [ratings, comments, reviews] = await Promise.all([
    db
      .select({ userId: rating.userId, releaseGroupId: rating.releaseGroupId, at: rating.updatedAt })
      .from(rating)
      .innerJoin(appUser, eq(rating.userId, appUser.id))
      .where(and(isNotNull(rating.releaseGroupId), gte(rating.updatedAt, since), PUBLIC_AUTHOR)),
    db
      .select({ userId: comment.userId, releaseGroupId: comment.releaseGroupId, at: comment.createdAt })
      .from(comment)
      .innerJoin(appUser, eq(comment.userId, appUser.id))
      .where(
        and(
          isNotNull(comment.releaseGroupId),
          rootCommentsOnly(),
          eq(comment.moderationStatus, "visible"),
          gte(comment.createdAt, since),
          PUBLIC_AUTHOR,
        ),
      ),
    db
      .select({ userId: review.userId, releaseGroupId: review.releaseGroupId, at: review.updatedAt })
      .from(review)
      .innerJoin(appUser, eq(review.userId, appUser.id))
      .where(
        and(
          isNotNull(review.releaseGroupId),
          eq(review.moderationStatus, "visible"),
          gte(review.updatedAt, since),
          PUBLIC_AUTHOR,
        ),
      ),
  ]);

  // Álbum → persona → actividad más reciente. La ventana es corta, así que el volumen de filas es chico.
  const byAlbum = new Map<string, Map<string, number>>();
  for (const row of [...ratings, ...comments, ...reviews]) {
    if (!row.releaseGroupId) continue;
    const people = byAlbum.get(row.releaseGroupId) ?? new Map<string, number>();
    const at = row.at.getTime();
    people.set(row.userId, Math.max(people.get(row.userId) ?? 0, at));
    byAlbum.set(row.releaseGroupId, people);
  }

  const ranked = [...byAlbum.entries()]
    .filter(([, people]) => people.size >= TRENDING_MIN_PEOPLE)
    .map(([releaseGroupId, people]) => ({
      releaseGroupId,
      participants: [...people.entries()].map(([userId, lastAt]) => ({ userId, lastAt })),
    }))
    .sort(compareByConversation)
    .slice(0, TRENDING_CANDIDATES);
  if (ranked.length === 0) return [];

  const details = await db
    .select({
      id: releaseGroup.id,
      title: releaseGroup.title,
      coverThumbUrl: releaseGroup.coverThumbUrl,
      // `"release_group"."id"` literal, no `releaseGroup.id`: drizzle lo renderiza como `"id"` sin calificar y dentro de
      // la subconsulta (que también tiene `artist a`) la referencia queda ambigua.
      artistName: PRIMARY_ARTIST_SQL(sql`"release_group"."id"`, sql`NULL`),
      artistId: PRIMARY_ARTIST_ID_SQL(sql`"release_group"."id"`, sql`NULL`),
    })
    .from(releaseGroup)
    .where(
      inArray(
        releaseGroup.id,
        ranked.map((candidate) => candidate.releaseGroupId),
      ),
    );
  const detailById = new Map(details.map((detail) => [detail.id, detail]));

  return ranked.flatMap((candidate) => {
    const detail = detailById.get(candidate.releaseGroupId);
    if (!detail) return [];
    return [
      {
        releaseGroupId: candidate.releaseGroupId,
        title: detail.title,
        coverThumbUrl: detail.coverThumbUrl,
        artistName: detail.artistName ?? null,
        artistId: detail.artistId ?? null,
        participants: candidate.participants,
      },
    ];
  });
}

// Más personas primero; a igualdad, la actividad más reciente.
function compareByConversation(
  a: { participants: { lastAt: number }[] },
  b: { participants: { lastAt: number }[] },
): number {
  if (b.participants.length !== a.participants.length) return b.participants.length - a.participants.length;
  const latest = (c: { participants: { lastAt: number }[] }) => Math.max(...c.participants.map((p) => p.lastAt));
  return latest(b) - latest(a);
}

let cache: TtlCache<Candidate[]> | null = null;
// Fin de la ventana para la próxima lectura: el `now` de la llamada que la dispara. `createTtlCache` no le pasa
// argumentos a `load`, y leer `Date.now()` ahí ignoraría el `now` inyectado (pruebas y smoke).
let windowEnd = Date.now();

function candidatesCache(): TtlCache<Candidate[]> {
  cache ??= createTtlCache<Candidate[]>({
    ttlMs: TRENDING_TTL_MS,
    load: () => queryCandidates(windowEnd),
    onError: () => [],
    errorLabel: "No se pudieron leer los álbumes con más conversación",
  });
  return cache;
}

// Personas con un bloqueo en cualquier dirección con el lector, entre las que participan en los candidatos.
async function blockedAmong(viewerId: string, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ blockerId: userBlock.blockerId, blockedId: userBlock.blockedId })
    .from(userBlock)
    .where(
      or(
        and(eq(userBlock.blockerId, viewerId), inArray(userBlock.blockedId, userIds)),
        and(eq(userBlock.blockedId, viewerId), inArray(userBlock.blockerId, userIds)),
      ),
    );
  return new Set(rows.map((row) => (row.blockerId === viewerId ? row.blockedId : row.blockerId)));
}

/**
 * Hasta `TRENDING_LIMIT` álbumes con más conversación en la ventana, para el lector (sin las personas con las que hay
 * un bloqueo). Un error devuelve `[]` (el riel no se muestra) y no se cachea.
 */
export async function listTrendingConversations(
  viewerId: string | null,
  now: number = Date.now(),
): Promise<TrendingConversation[]> {
  windowEnd = now;
  const candidates = await candidatesCache().get(now);
  if (candidates.length === 0) return [];

  let blocked = new Set<string>();
  if (viewerId) {
    const involved = [...new Set(candidates.flatMap((c) => c.participants.map((p) => p.userId)))];
    try {
      blocked = await blockedAmong(viewerId, involved);
    } catch (error) {
      // Sin poder aplicar el bloqueo no se muestra nada: mejor un riel vacío que uno con alguien bloqueado.
      console.error("No se pudo aplicar el bloqueo al riel de conversación", error);
      return [];
    }
  }

  return candidates
    .map((candidate) => ({
      ...candidate,
      participants: candidate.participants.filter((p) => !blocked.has(p.userId)),
    }))
    .filter((candidate) => candidate.participants.length >= TRENDING_MIN_PEOPLE)
    .sort(compareByConversation)
    .slice(0, TRENDING_LIMIT)
    .map(({ participants, ...rest }) => ({ ...rest, people: participants.length }));
}

/** Solo para pruebas: vacía la caché. */
export function resetTrendingConversationsCache(): void {
  cache = null;
}
