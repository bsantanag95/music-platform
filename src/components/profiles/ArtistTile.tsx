import { AppImage } from "@/components/ui/AppImage";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { FollowedArtist } from "@/services/social/artist-following";

interface ArtistTileProps {
  artist: FollowedArtist;
  shared: boolean;
  /** `size-20` en Exploración (Nivel 2), `size-24` en el listado completo. */
  size?: string;
  /**
   * Traductor del namespace `users`, resuelto una sola vez por el Server
   * Component que arma la grilla (no `async` acá a propósito: un componente
   * async anidado dentro de otro no se resuelve al testear con `render()` de
   * `@testing-library/react`, que no es el pipeline real de RSC de Next).
   */
  t: (key: string) => string;
}

// Celda de artista reutilizada por `ExploreSection` (Nivel 2, hasta 8) y la
// vista completa `/users/[username]/artists` — mismo círculo, mismo punto de
// recorrido, misma insignia "tú también", solo cambia el tamaño del avatar.
export function ArtistTile({ artist, shared, size = "size-20", t }: ArtistTileProps) {

  return (
    <Link href={`/artist/${artist.id}`} className="group flex flex-col items-center gap-2 text-center">
      <div className="relative">
        {artist.photoUrl ? (
          <div className={`relative ${size} overflow-hidden rounded-full border border-ink-border transition-colors group-hover:border-amber`}>
            <AppImage src={artist.photoUrl} alt="" fill sizes="6rem" className="object-cover" />
          </div>
        ) : (
          <DiscPlaceholder
            alt=""
            className={`${size} rounded-full border border-ink-border transition-colors group-hover:border-amber`}
          />
        )}
        {/* Faceta de recorrido de artista (openspec: add-artist-journey):
            solo un punto discreto para en-curso/completo — nunca un número
            ni un badge de "pendiente" (§6.4.1). */}
        {artist.journeyState && (
          <span
            aria-label={t(
              artist.journeyState === "complete" ? "journeyStateComplete" : "journeyStateInProgress",
            )}
            title={t(artist.journeyState === "complete" ? "journeyStateComplete" : "journeyStateInProgress")}
            className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-ink-surface ${
              artist.journeyState === "complete" ? "bg-petrol" : "bg-paper-muted"
            }`}
          />
        )}
      </div>
      <span className="line-clamp-2 font-data text-xs text-paper transition-colors group-hover:text-amber">
        {artist.name}
      </span>
      {shared && (
        <span className="rounded bg-amber px-1.5 py-0.5 font-data text-[0.625rem] text-ink">
          {t("explorationMutualBadge")}
        </span>
      )}
    </Link>
  );
}
