import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ListCoverMosaic } from "@/components/lists/ListCoverMosaic";
import { listHref } from "@/lib/catalog-links";
import type { CaminoDiscoverySummary } from "@/services/camino/discovery";

// Grilla de tarjetas de "Listas para completar": la usan `/caminos` y la
// sección "Para completar" de `/lists`. Vitrina, sin posiciones ni insignias.
export async function CaminoDiscoveryGrid({ caminos }: { caminos: CaminoDiscoverySummary[] }) {
  const t = await getTranslations("camino");

  return (
    <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {caminos.map((camino) => (
        <li key={camino.id}>
          <Link
            href={
              camino.kind === "custom_journey"
                ? `/users/${camino.owner.username}/caminos/${camino.id}`
                : listHref(camino.owner.username, camino.title, camino.id)
            }
            className="flex flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
          >
            <ListCoverMosaic coverThumbs={camino.coverThumbs} className="w-full" />
            <span className="truncate font-display text-sm text-paper">{camino.title}</span>
            <span className="font-data text-xs text-paper-muted">
              {t("ownedBy", { username: camino.owner.username })}
            </span>
            <span className="font-data text-xs text-petrol">
              {t("trackingCount", { count: camino.trackingCount })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
