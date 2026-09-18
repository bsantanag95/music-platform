import { cache } from "react";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistFollow } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { journeyStatesForArtists } from "@/services/artist-journeys/artist-journeys";
import type { FollowedArtist } from "@/services/social/artist-following";

// Sección "Exploración" del perfil (openspec: add-artist-following): los
// artistas que el dueño sigue, como contexto de "hacia dónde mira". Se rinde
// en los niveles autorizado y dueño. `artist_follow` no tiene audiencia —
// basta el chequeo de acceso al perfil. Cálculo bajo demanda con `cache()`.
//
// Paginado (antes traía hasta 12 sin recorte visual ni forma de ver el
// resto): la vista de Nivel 2 pide la página 1 con el tamaño por defecto (8,
// el cupo de la grilla 2×4) y decide en `ExploreSection` si trunca con una
// celda "+N"; `/users/[username]/artists` pide páginas de hasta 50 para el
// listado completo de solo lectura.

export const EXPLORATION_PREVIEW_PAGE_SIZE = 8;

export interface FollowedArtistsPage {
  artists: FollowedArtist[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export const listProfileFollowedArtists = cache(
  async (
    username: string,
    viewerId: string | null,
    page = 1,
    pageSize = EXPLORATION_PREVIEW_PAGE_SIZE,
  ): Promise<FollowedArtistsPage> => {
    if (page < 1 || pageSize < 1 || pageSize > 50) {
      throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
    }

    const { getProfileByUsername } = await import("@/services/social/profiles");
    const profile = await getProfileByUsername(username, viewerId);
    if (!profile.accessible) return { artists: [], totalCount: 0, page, pageSize, hasNext: false };

    const [rows, [countRow]] = await Promise.all([
      db
        .select({
          id: artist.id,
          name: artist.name,
          type: artist.type,
          photoUrl: artist.photoUrl,
        })
        .from(artistFollow)
        .innerJoin(artist, eq(artist.id, artistFollow.artistId))
        .where(eq(artistFollow.userId, profile.id))
        .orderBy(desc(artistFollow.createdAt), desc(artistFollow.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(artistFollow)
        .where(eq(artistFollow.userId, profile.id)),
    ]);
    const totalCount = countRow?.count ?? 0;

    // Faceta de recorrido (openspec: add-artist-journey, D6 de design.md):
    // una sola consulta agregada para todos los artistas de la página, nunca
    // una por artista. Solo del dueño del perfil — nunca del visitante.
    const journeyStates = await journeyStatesForArtists(
      profile.id,
      rows.map((r) => r.id),
    );

    return {
      artists: rows.map((row) => ({ ...row, journeyState: journeyStates.get(row.id) })),
      totalCount,
      page,
      pageSize,
      hasNext: page * pageSize < totalCount,
    };
  },
);
