import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { FollowedArtist } from "@/services/social/artist-following";

interface ExploreSectionProps {
  artists: FollowedArtist[];
}

// Sección "Exploración" del perfil (openspec: add-artist-following): los
// artistas que esta persona sigue, como contexto de "hacia dónde mira". Server
// Component; no renderiza si está vacía. Se muestra en autorizado + dueño.
export async function ExploreSection({ artists }: ExploreSectionProps) {
  const t = await getTranslations("users");
  if (artists.length === 0) return null;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("explorationHeading")}</h2>
      <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4">
        {artists.map((artist) => (
          <li key={artist.id}>
            <Link href={`/artist/${artist.id}`} className="group flex flex-col items-center gap-2 text-center">
              {artist.photoUrl ? (
                <div className="relative size-16 overflow-hidden rounded-full border border-ink-border transition-colors group-hover:border-amber">
                  <Image src={artist.photoUrl} alt="" fill sizes="4rem" className="object-cover" />
                </div>
              ) : (
                <DiscPlaceholder
                  alt=""
                  className="size-16 rounded-full border border-ink-border transition-colors group-hover:border-amber"
                />
              )}
              <span className="line-clamp-2 font-data text-xs text-paper transition-colors group-hover:text-amber">
                {artist.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
