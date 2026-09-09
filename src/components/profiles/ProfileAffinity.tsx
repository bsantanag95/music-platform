import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import type { ProfileAffinity as ProfileAffinityData } from "@/services/profiles/affinity";
import type { ShowcaseEntity } from "@/services/profiles/showcase";

interface ProfileAffinityProps {
  affinity: ProfileAffinityData;
}

// Coincidencias entre el visitante y el dueño del perfil: favoritos en común,
// entidades que ambos puntúan alto, y seguidores en común. Solo aparece si hay
// alguna coincidencia (esa decisión vive en `getProfileAffinity`, que devuelve
// null si no hay nada). Server Component. Ver spec profile-affinity.
export async function ProfileAffinity({ affinity }: ProfileAffinityProps) {
  const t = await getTranslations("users");
  const { sharedFavorites, sharedHighRatings, sharedFollowedArtists, mutualFollowers } = affinity;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("affinity.heading")}</h2>

      {mutualFollowers > 0 && (
        <p className="font-data text-xs text-paper-muted">
          {t("affinity.mutualFollowers", { count: mutualFollowers })}
        </p>
      )}

      {sharedFavorites.length > 0 && (
        <EntityRow label={t("affinity.sharedFavorites")} entities={sharedFavorites} />
      )}
      {sharedHighRatings.length > 0 && (
        <EntityRow label={t("affinity.sharedHighRatings")} entities={sharedHighRatings} />
      )}
      {sharedFollowedArtists.length > 0 && (
        <EntityRow label={t("affinity.sharedFollowedArtists")} entities={sharedFollowedArtists} />
      )}
    </section>
  );
}

function EntityRow({ label, entities }: { label: string; entities: ShowcaseEntity[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-data text-xs uppercase tracking-wide text-paper-muted">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {entities.map((entity) => (
          <li key={entity.id}>
            <Link
              href={targetHref(entity.type, entity.id)}
              className="group flex items-center gap-2 rounded border border-ink-border bg-ink-surface px-2 py-1.5 transition-colors hover:border-amber"
            >
              <CoverThumb cover={entity.coverThumbUrl} label="" className="size-8" />
              <span className="min-w-0">
                <span className="block truncate font-body text-xs text-paper transition-colors group-hover:text-amber">
                  {entity.title}
                </span>
                {entity.artistName && (
                  <span className="block truncate font-data text-[0.625rem] text-paper-muted">
                    {entity.artistName}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
