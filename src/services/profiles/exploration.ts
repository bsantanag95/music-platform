import { cache } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { artist, artistFollow } from "@/db/schema";
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

    return db
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
  },
);
