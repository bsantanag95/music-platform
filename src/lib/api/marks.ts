import { apiFetch } from "./client";
import { TargetMarksSchema, type SocialTargetType, type TargetMarks } from "./schemas";

// Marcas propias sobre un artista, álbum o canción, para el diálogo de acciones rápidas del
// Header (openspec: add-header-quick-actions).
export function getTargetMarks(type: SocialTargetType, id: string): Promise<TargetMarks> {
  const query = new URLSearchParams({ type, id });
  return apiFetch(`/api/me/marks?${query.toString()}`, TargetMarksSchema);
}
