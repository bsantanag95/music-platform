import { getTranslations } from "next-intl/server";
import { hasMusicIdentity, type MusicIdentityData } from "@/lib/music-identity";
import type { FollowedArtist } from "@/services/social/artist-following";
import { ExploreSection } from "./ExploreSection";
import { FingerprintSummary } from "./FingerprintSummary";
import { ProfileFicha } from "./ProfileFicha";
import { StripHeading } from "./StripHeading";

interface IdentityStripProps {
  username: string;
  identity: MusicIdentityData;
  /** Nombres de los géneros elegidos, desde la taxonomía. */
  genreLabels: Record<string, string>;
  /** Resumen de la huella, o null si no hay datos suficientes para quien mira. */
  fingerprint: { topDecade: string | null; phrases: string[] } | null;
  artists: FollowedArtist[];
  artistsTotal: number;
  /** Artistas que el visitante también sigue (mismo cálculo que el bloque de afinidad). */
  sharedArtistIds?: Set<string>;
}

// Franja de identidad (spec social-profiles, "Franja de identidad"; openspec:
// redesign-user-profile-phase1): a todo el ancho, justo debajo de la cabecera,
// la ficha musical | el resumen de la huella con su década predominante |
// «Artistas seguidos», separados por filetes y sin tarjetas. Cada parte se
// omite cuando no tiene contenido, sin dejar hueco, y la franja entera cuando
// no queda ninguna. Reemplaza a la columna lateral pegajosa, que le quitaba
// ancho a todo el contenido. Server Component.
export async function IdentityStrip({
  username,
  identity,
  genreLabels,
  fingerprint,
  artists,
  artistsTotal,
  sharedArtistIds,
}: IdentityStripProps) {
  const shownGenres = identity.genres.filter((genre) => genre in genreLabels);
  const hasFicha = hasMusicIdentity({ ...identity, genres: shownGenres });
  const hasFingerprint = Boolean(fingerprint && (fingerprint.topDecade || fingerprint.phrases.length > 0));
  const hasArtists = artists.length > 0;
  if (!hasFicha && !hasFingerprint && !hasArtists) return null;

  const t = await getTranslations("users");
  const part = "min-w-0 py-5 lg:px-7 lg:first:pl-0 lg:last:pr-0";

  return (
    <div className="flex w-full flex-col divide-y divide-ink-border border-y border-ink-border lg:flex-row lg:divide-x lg:divide-y-0">
      {hasFicha && (
        <section aria-labelledby="ficha-musical" className={`${part} lg:flex-[1.25]`}>
          <StripHeading id="ficha-musical">{t("strip.ficha")}</StripHeading>
          <ProfileFicha identity={identity} t={t} genreLabels={genreLabels} />
        </section>
      )}
      {hasFingerprint && fingerprint && (
        <div className={`${part} lg:flex-1`}>
          <FingerprintSummary username={username} topDecade={fingerprint.topDecade} phrases={fingerprint.phrases} />
        </div>
      )}
      {hasArtists && (
        <div className={`${part} lg:flex-[1.1]`}>
          <ExploreSection
            username={username}
            artists={artists}
            totalCount={artistsTotal}
            sharedArtistIds={sharedArtistIds}
          />
        </div>
      )}
    </div>
  );
}
