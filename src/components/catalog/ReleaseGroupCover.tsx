"use client";

import { CoverThumb } from "./CoverThumb";
import { LazyCoverImage } from "./LazyCoverImage";

interface ReleaseGroupCoverProps {
  releaseGroupId: string;
  /** Carátula que ya trajo el payload (nula si no hay o fue retirada). */
  coverThumbUrl?: string | null;
  /** La carátula ya tiene respuesta (`isCoverResolved` en el servidor). Sin el dato, se resuelve aparte. */
  coverResolved?: boolean;
  label?: string;
  className?: string;
}

/**
 * Carátula de un disco que puede venir ya resuelta en el payload. Resuelta, se pinta en la carga inicial (o la silueta,
 * si no hay); si no, `LazyCoverImage` la pide al hacerse visible. Así una lista no hace una petición `/cover` por fila
 * para carátulas que el servidor ya conocía.
 */
export function ReleaseGroupCover({ releaseGroupId, coverThumbUrl = null, coverResolved = false, label = "", className = "" }: ReleaseGroupCoverProps) {
  if (coverResolved) return <CoverThumb cover={coverThumbUrl} label={label} className={className} />;
  return <LazyCoverImage releaseGroupId={releaseGroupId} coverLabel={label} className={className} />;
}
