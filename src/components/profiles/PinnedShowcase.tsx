import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "@/components/favorites/ArtistPlate";
import { targetHref } from "@/components/feed/feed-target";
import type { PinnedItem, ShowcaseEntityType } from "@/services/profiles/showcase";

interface PinnedShowcaseProps {
  pinned: PinnedItem[];
}

const KIND_KEY = {
  artist: "artist",
  "release-group": "album",
  recording: "song",
} as const satisfies Record<ShowcaseEntityType, string>;

// Sección "Empieza por aquí": hasta cuatro recomendaciones dirigidas a quien
// visita el perfil, una por fila (variante B de los mockups, openspec:
// simplify-profile-curation). Lo que la distingue de Favoritos es la nota del
// dueño, que se muestra completa como una cita junto al ítem. Un ítem sin nota
// se dibuja igual, sin línea vacía. No excluye lo que coincida con la Tarjeta de
// Identidad: fijar un ítem y definir la identidad son decisiones independientes.
// Server Component. Ver spec profile-showcase.
export async function PinnedShowcase({ pinned }: PinnedShowcaseProps) {
  const t = await getTranslations("users");
  if (pinned.length === 0) return null;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("showcase.pinnedHeading")}</h2>
      <ul className="flex flex-col">
        {pinned.map((item) => (
          <li key={item.id} className="border-t border-ink-border py-4 first:border-t-0 first:pt-0">
            <Link
              href={targetHref(item.entity.type, item.entity.id)}
              className="group flex items-start gap-3 sm:gap-4"
            >
              {item.entity.type === "artist" ? (
                <ArtistPlate
                  title={item.entity.title}
                  className="size-16 transition-colors group-hover:border-amber sm:size-22"
                />
              ) : (
                <CoverThumb
                  cover={item.entity.coverThumbUrl}
                  label=""
                  className="size-16 border border-ink-border transition-colors group-hover:border-amber sm:size-22"
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-data text-[10px] uppercase tracking-wider text-petrol">
                  {t(`showcase.kind.${KIND_KEY[item.entity.type]}`)}
                </span>
                <span className="font-display text-base text-paper transition-colors group-hover:text-amber">
                  {item.entity.title}
                </span>
                {item.entity.artistName && (
                  <span className="font-data text-xs text-paper-muted">{item.entity.artistName}</span>
                )}
                {item.note && (
                  <span className="mt-2 border-l-2 border-amber pl-3 font-body text-base italic text-paper">
                    {item.note}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
