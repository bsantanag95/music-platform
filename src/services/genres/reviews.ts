import { listRecentAlbumReviews, type ReviewDetail } from "@/services/reviews";
import { GENRE_REVIEWS_SIZE } from "./constants";
import { albumInGenreTreeOnce } from "./read";

// Reseñas recientes de un género (openspec: redesign-genre-page, capability `genre-page-community`):
// las últimas reseñas visibles de álbumes del género o de sus subgéneros. La visibilidad (moderación,
// autor desactivado enmascarado, bloqueos con el lector) es la de la página del álbum.

export function getGenreRecentReviews(genreId: string, readerId: string | null): Promise<ReviewDetail[]> {
  return listRecentAlbumReviews(albumInGenreTreeOnce(genreId), readerId, GENRE_REVIEWS_SIZE);
}
