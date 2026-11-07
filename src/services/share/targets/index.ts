import { createHash } from "node:crypto";
import { cache } from "react";
import type { ShareLocale, ShareTargetKind } from "@/lib/share/kinds";
import type { ShareTarget } from "../types";
import { loadAlbumTarget, loadArtistTarget, loadSongTarget } from "./catalog";
import { loadCeremonyTarget, loadCollectionTarget, loadGenreTarget, loadIndexTarget } from "./collections";
import { loadLaminaTarget } from "./lamina";
import { loadProfileTarget } from "./profile";
import { loadListenTarget, loadRatingTarget } from "./relation";
import {
  loadCaminoTarget,
  loadCommentTarget,
  loadFingerprintTarget,
  loadListTarget,
  loadReviewTarget,
  loadUserCollectionTarget,
} from "./user-content";

// Punto único de carga de los objetivos de compartir (design D3). La ruta de imágenes y los metadatos de cada
// página pasan por acá, así que calculan la misma versión con los mismos datos. `cache` evita repetir las
// consultas dentro del mismo request (los metadatos y la cabecera de la página piden el mismo objetivo).

export const loadShareTarget = cache(async (kind: ShareTargetKind, ref: string, locale: ShareLocale): Promise<ShareTarget | null> => {
  switch (kind) {
    case "album":
      return loadAlbumTarget(ref, locale);
    case "song":
      return loadSongTarget(ref, locale);
    case "artist":
      return loadArtistTarget(ref, locale);
    case "genre":
      return loadGenreTarget(ref, locale);
    case "ceremony":
      return loadCeremonyTarget(ref, locale, "competition");
    case "hall_class":
      return loadCeremonyTarget(ref, locale, "hall_of_fame");
    case "collection":
      return loadCollectionTarget(ref, locale);
    case "profile":
      return loadProfileTarget(ref, locale);
    case "review":
      return loadReviewTarget(ref, locale);
    case "comment":
      return loadCommentTarget(ref, locale);
    case "list":
      return loadListTarget(ref, locale);
    case "camino":
      return loadCaminoTarget(ref, locale);
    case "user_collection":
      return loadUserCollectionTarget(ref, locale);
    case "fingerprint":
      return loadFingerprintTarget(ref, locale);
    case "rating":
      return loadRatingTarget(ref, locale);
    case "listen":
      return loadListenTarget(ref, locale);
    case "top":
      return loadLaminaTarget(ref, locale);
    case "awards":
    case "halls":
    case "collections":
      return ref === "-" ? loadIndexTarget(kind, locale) : null;
    case "award":
    case "hall":
      // La ficha de un premio o de un salón redirige a su última ceremonia o clase: se comparte esa.
      return null;
  }
});

/** Versión de contenido de la imagen: hash de todo lo que la imagen muestra (spec share-images, caché). */
export function shareTargetVersion(target: ShareTarget): string {
  return createHash("sha256").update(JSON.stringify(target)).digest("hex").slice(0, 12);
}
