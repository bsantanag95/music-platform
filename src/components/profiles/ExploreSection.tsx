import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { FollowedArtist } from "@/services/social/artist-following";

interface ExploreSectionProps {
  artists: FollowedArtist[];
  /**
   * Ids de artistas que el visitante también sigue (spec `profile-affinity`,
   * "Indicadores de afinidad en 'Exploración'") — reutiliza el cálculo del
   * bloque de afinidad, sin consulta adicional. `undefined` para el propio
   * dueño o un visitante sin sesión: ninguna tarjeta muestra la insignia.
   */
  sharedArtistIds?: Set<string>;
}

// Sección "Exploración" del perfil (openspec: add-artist-following): los
// artistas que esta persona sigue, como contexto de "hacia dónde mira". Es el
// único momento visualmente "alto" del Nivel 2 (openspec: rework-user-profile)
// — avatares más grandes que el resto de las secciones, y el único lugar del
// Nivel 2 donde aparece ámbar en reposo además del medidor de valoraciones
// (Regla de Rareza, DESIGN.md): la insignia "tú también" de un artista en
// común. Server Component; no renderiza si está vacía. Se muestra en
// autorizado + dueño.
export async function ExploreSection({ artists, sharedArtistIds }: ExploreSectionProps) {
  const t = await getTranslations("users");
  if (artists.length === 0) return null;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-5">
      <h2 className="font-display text-xl text-paper">{t("explorationHeading")}</h2>
      <ul className="grid grid-cols-3 gap-5 sm:grid-cols-4">
        {artists.map((artist) => {
          const shared = sharedArtistIds?.has(artist.id) ?? false;
          return (
            <li key={artist.id}>
              <Link href={`/artist/${artist.id}`} className="group flex flex-col items-center gap-2 text-center">
                <div className="relative">
                  {artist.photoUrl ? (
                    <div className="relative size-20 overflow-hidden rounded-full border border-ink-border transition-colors group-hover:border-amber">
                      <Image src={artist.photoUrl} alt="" fill sizes="5rem" className="object-cover" />
                    </div>
                  ) : (
                    <DiscPlaceholder
                      alt=""
                      className="size-20 rounded-full border border-ink-border transition-colors group-hover:border-amber"
                    />
                  )}
                  {/* Faceta de recorrido de artista (openspec: add-artist-journey):
                      solo un punto discreto para en-curso/completo — nunca un
                      número ni un badge de "pendiente" (§6.4.1). */}
                  {artist.journeyState && (
                    <span
                      aria-label={t(
                        artist.journeyState === "complete"
                          ? "journeyStateComplete"
                          : "journeyStateInProgress",
                      )}
                      title={t(
                        artist.journeyState === "complete"
                          ? "journeyStateComplete"
                          : "journeyStateInProgress",
                      )}
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
            </li>
          );
        })}
      </ul>
    </section>
  );
}
