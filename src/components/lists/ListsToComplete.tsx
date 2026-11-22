import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/discovery/SectionHeader";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { CaminoDiscoverySummary } from "@/services/camino/discovery";
import { caminoHref } from "@/components/camino/camino-href";

/** Listas que muestra la sección; el resto, en `/caminos`. */
export const TO_COMPLETE_SHOWN = 4;

/**
 * Deja las listas "para completar" que contienen `query` en el título (sin distinguir mayúsculas ni acentos). Sin texto, todas.
 * `discoverCaminos` no filtra por texto y son como mucho unas pocas, así que se filtra en memoria (openspec:
 * separate-lists-to-complete).
 */
export function matchToComplete<T extends { title: string }>(caminos: T[], query: string | undefined): T[] {
  const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase();
  const needle = query ? fold(query.trim()) : "";
  return needle ? caminos.filter((camino) => fold(camino.title).includes(needle)) : caminos;
}

/**
 * "Para completar" de `/lists` (openspec: separate-lists-to-complete): una sección propia tras Destacadas, no una pestaña del
 * lector, porque completar una lista es una acción y no otra forma de descubrir listas. Tarjetas con la tira de carátulas, quién
 * la armó, cuántas personas la están completando y "Completarla". Sin listas, no se renderiza.
 */
export async function ListsToComplete({ caminos }: { caminos: CaminoDiscoverySummary[] }) {
  const shown = caminos.slice(0, TO_COMPLETE_SHOWN);
  if (shown.length === 0) return null;
  const [t, tCamino] = await Promise.all([getTranslations("lists"), getTranslations("camino")]);

  return (
    <section id="para-completar" className="flex w-full flex-col gap-5">
      <SectionHeader
        heading={tCamino("hub.toComplete")}
        description={t("community.toComplete.description")}
        seeAll={{ href: "/caminos", label: tCamino("hub.seeAll") }}
        size="page"
      />
      <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {shown.map((camino) => {
          const href = caminoHref(camino);
          const covers = Array.from({ length: 4 }, (_, i) => camino.coverThumbs[i] ?? null);
          const owner = camino.owner.displayName ?? `@${camino.owner.username}`;
          return (
            <li key={camino.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
              <article className="flex h-full flex-col gap-4 rounded-xl border border-ink-border bg-ink-surface p-4 transition-colors hover:border-petrol-hover/60">
                <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
                  {covers.map((cover, index) => (
                    <CoverThumb key={index} cover={cover} label="" className="aspect-square w-full rounded ring-1 ring-ink" />
                  ))}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="line-clamp-2 font-display text-lg leading-tight text-paper">
                    <Link href={href} className="transition-colors hover:text-amber">
                      {camino.title}
                    </Link>
                  </h3>
                  <p className="truncate font-body text-sm text-paper-muted">{t("byOwner", { name: owner })}</p>
                  <p className="font-data text-xs text-petrol-hover">{tCamino("trackingCount", { count: camino.trackingCount })}</p>
                </div>
                <Link
                  href={href}
                  className="inline-flex h-11 items-center justify-center rounded-md bg-amber px-4 font-display text-sm font-medium text-ink transition-colors hover:bg-amber-hover"
                >
                  {t("community.toComplete.action")}
                </Link>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
