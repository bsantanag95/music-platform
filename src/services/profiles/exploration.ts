import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistFollow } from "@/db/schema";
import { journeyStatesForArtists } from "@/services/artist-journeys/artist-journeys";
import type { FollowedArtist } from "@/services/social/artist-following";

// Sección "Exploración" del perfil (openspec: add-artist-following): los
// artistas que el dueño sigue, como contexto de "hacia dónde mira". Se rinde
// en los niveles autorizado y dueño. `artist_follow` no tiene audiencia —
// basta el chequeo de acceso al perfil. Cálculo bajo demanda con `cache()`.

const PROFILE_FOLLOWED_ARTISTS_LIMIT = 12;

export const listProfileFollowedArtists = cache(
  async (
    username: string,
    viewerId: string | null,
    limit = PROFILE_FOLLOWED_ARTISTS_LIMIT,
  ): Promise<FollowedArtist[]> => {
    const { getProfileByUsername } = await import("@/services/social/profiles");
    const profile = await getProfileByUsername(username, viewerId);
    if (!profile.accessible) return [];

    const rows = await db
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
      .limit(limit);

    // Faceta de recorrido (openspec: add-artist-journey, D6 de design.md):
    // una sola consulta agregada para todos los artistas de la página, nunca
    // una por artista. Solo del dueño del perfil — nunca del visitante.
    const journeyStates = await journeyStatesForArtists(
      profile.id,
      rows.map((r) => r.id),
    );
    return rows.map((row) => ({ ...row, journeyState: journeyStates.get(row.id) }));
  },
);
