import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ListCard } from "@/components/lists/ListCard";
import { ListsGrid } from "@/components/lists/lists-shared";
import { ListCoverMosaic } from "@/components/lists/ListCoverMosaic";
import { listHref } from "@/lib/catalog-links";
import type { CaminoDiscoverySummary } from "@/services/camino/discovery";

// Grilla de tarjetas de "Listas para completar": la usan `/caminos` y la
// sección "Para completar" de `/lists`. Vitrina, sin posiciones ni insignias.
//
// En `/lists` va `dense` (openspec: polish-community-lists): la misma tarjeta compacta horizontal que Populares y
// Recientes. La tarjeta de vitrina, con un mosaico del ancho de la tarjeta, medía unos 420 px de alto y no se
// parecía a ninguna otra sección de la página.

function caminoHref(camino: CaminoDiscoverySummary): string {
  return camino.kind === "custom_journey"
    ? `/users/${camino.owner.username}/caminos/${camino.id}`
    : listHref(camino.owner.username, camino.title, camino.id);
}

export async function CaminoDiscoveryGrid({ caminos, dense = false }: { caminos: CaminoDiscoverySummary[]; dense?: boolean }) {
  const t = await getTranslations("camino");

  if (dense) {
    return (
      <ListsGrid cols={3}>
        {caminos.map((camino) => (
          <ListCard
            key={camino.id}
            dense
            href={caminoHref(camino)}
            title={camino.title}
            coverThumbs={camino.coverThumbs}
            meta={<span>{t("ownedBy", { username: camino.owner.username })}</span>}
            subMeta={<span className="text-petrol">{t("trackingCount", { count: camino.trackingCount })}</span>}
          />
        ))}
      </ListsGrid>
    );
  }

  return (
    <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {caminos.map((camino) => (
        <li key={camino.id}>
          <Link
            href={caminoHref(camino)}
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
