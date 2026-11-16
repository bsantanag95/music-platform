import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import type { ProfileAffinity as ProfileAffinityData } from "@/services/profiles/affinity";
import type { ShowcaseEntity } from "@/services/profiles/showcase";

interface ProfileAffinityProps {
  affinity: ProfileAffinityData;
  /**
   * Una sola línea para la cabecera del perfil (openspec: redesign-user-profile-phase1):
   * cada grupo de coincidencias como miniaturas con su nombre de tooltip.
   */
  compact?: boolean;
}

const COMPACT_LIMIT = 4;

// Coincidencias entre el visitante y el dueño del perfil: favoritos en común,
// entidades que ambos puntúan alto, y seguidores en común. Solo aparece si hay
// alguna coincidencia (esa decisión vive en `getProfileAffinity`, que devuelve
// null si no hay nada). Server Component. Ver spec profile-affinity.
export async function ProfileAffinity({ affinity, compact = false }: ProfileAffinityProps) {
  const t = await getTranslations("users");
  const { sharedFavorites, sharedHighRatings, sharedFollowedArtists, mutualFollowers } = affinity;

  if (compact) {
    const groups = [
      { key: "favorites", label: t("affinity.sharedFavorites"), entities: sharedFavorites },
      { key: "ratings", label: t("affinity.sharedHighRatings"), entities: sharedHighRatings },
      { key: "artists", label: t("affinity.sharedFollowedArtists"), entities: sharedFollowedArtists },
    ].filter((group) => group.entities.length > 0);
    return (
      <section aria-labelledby="coincidencias" className="flex flex-col gap-2">
        <h2 id="coincidencias" className="font-data text-[0.6875rem] uppercase tracking-[0.12em] text-paper-muted">
          {t("affinity.heading")}
          {mutualFollowers > 0 && (
            <span className="normal-case tracking-normal">
              {" · "}
              {t("affinity.mutualFollowers", { count: mutualFollowers })}
            </span>
          )}
        </h2>
        {groups.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {groups.map((group) => (
              <li key={group.key} className="flex items-center gap-2">
                <span className="font-data text-xs text-paper-muted">{group.label}</span>
                <ul className="flex items-center gap-1">
                  {group.entities.slice(0, COMPACT_LIMIT).map((entity) => {
                    const name = entity.artistName ? `${entity.title} — ${entity.artistName}` : entity.title;
                    return (
                      <li key={entity.id}>
                        <Link
                          href={targetHref(entity.type, entity.id, entity.title, entity.artistName ?? null)}
                          aria-label={name}
                          title={name}
                          className="block rounded transition-opacity hover:opacity-80"
                        >
                          <CoverThumb
                            cover={entity.coverThumbUrl}
                            label=""
                            className={`size-7 border border-ink-border ${entity.type === "artist" ? "rounded-full" : ""}`}
                          />
                        </Link>
                      </li>
                    );
                  })}
                  {group.entities.length > COMPACT_LIMIT && (
                    <li className="font-data text-xs text-paper-muted">+{group.entities.length - COMPACT_LIMIT}</li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

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
              href={targetHref(entity.type, entity.id, entity.title, entity.artistName ?? null)}
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
