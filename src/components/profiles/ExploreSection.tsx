import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArtistTile } from "@/components/profiles/ArtistTile";
import { StripHeading } from "@/components/profiles/StripHeading";
import type { FollowedArtist } from "@/services/social/artist-following";

interface ExploreSectionProps {
  username: string;
  /** Página 1 del listado, hasta `EXPLORATION_PREVIEW_PAGE_SIZE` (8) artistas. */
  artists: FollowedArtist[];
  /** Total de artistas seguidos por el dueño — determina si hace falta la celda "+N". */
  totalCount: number;
  /**
   * Ids de artistas que el visitante también sigue (spec `profile-affinity`,
   * "Indicadores de afinidad en 'Exploración'") — reutiliza el cálculo del
   * bloque de afinidad, sin consulta adicional. `undefined` para el propio
   * dueño o un visitante sin sesión: ninguna tarjeta muestra la insignia.
   */
  sharedArtistIds?: Set<string>;
}

// «Artistas seguidos» (antes "Exploración"; openspec: add-artist-following,
// redesign-user-profile-phase1): los artistas que esta persona sigue, como
// contexto de "hacia dónde mira", en la franja de identidad que sigue a la
// cabecera. Es el único lugar de esa franja donde aparece ámbar en reposo
// (Regla de Rareza, DESIGN.md): la insignia "tú también" de un artista en
// común. Server Component; no renderiza si está vacía. Se muestra en
// autorizado + dueño.
//
// Tope de 8 celdas (4 por fila): si `totalCount` supera lo que trae esta
// página, la 8ª celda deja de ser un artista y pasa a ser el link "+N" al
// listado completo (`/users/[username]/artists`) — elegida entre 4 mockups de
// cómo truncar (ver memoria profile-redesign). Nunca se agrega una 9ª celda:
// siempre son 7 artistas + el link, u 8 artistas sin link.
export async function ExploreSection({ username, artists, totalCount, sharedArtistIds }: ExploreSectionProps) {
  const t = await getTranslations("users");
  if (artists.length === 0) return null;

  const overflow = totalCount > artists.length;
  const visibleArtists = overflow ? artists.slice(0, 7) : artists;
  const moreCount = totalCount - visibleArtists.length;

  return (
    <section aria-labelledby="artistas-seguidos" className="min-w-0">
      <StripHeading
        id="artistas-seguidos"
        link={{ href: `/users/${username}/artists`, label: String(totalCount), ariaLabel: t("explorationMoreLabel") }}
      >
        {t("explorationHeading")}
      </StripHeading>
      <ul className="grid grid-cols-4 gap-x-3 gap-y-4">
        {visibleArtists.map((artist) => (
          <li key={artist.id} className="min-w-0">
            <ArtistTile artist={artist} shared={sharedArtistIds?.has(artist.id) ?? false} size="size-14" t={t} />
          </li>
        ))}
        {overflow && (
          <li className="min-w-0">
            <Link
              href={`/users/${username}/artists`}
              className="group flex flex-col items-center gap-2 text-center"
            >
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-ink-border font-display text-base text-paper-muted transition-colors group-hover:border-amber group-hover:text-paper">
                +{moreCount}
              </span>
              <span className="font-data text-xs text-paper-muted transition-colors group-hover:text-paper">
                {t("explorationMoreLabel")}
              </span>
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}
