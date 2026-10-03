import type { AlbumGenreVotes } from "./votes";

/** Forma de la respuesta de la API (`AlbumGenreVotesResponseSchema`): el acceso se aplana. */
export function toVotesResponse(votes: AlbumGenreVotes) {
  return {
    genres: votes.genres,
    showCounts: votes.showCounts,
    canVote: votes.access.canVote,
    reason: votes.access.canVote ? null : votes.access.reason,
  };
}
