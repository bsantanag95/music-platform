import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import type { AlsoInGroup } from "@/services/catalog/artist-also-in";
import { formatPartialDate, yearOf } from "./artist-format";

// Franja "También en" de la página de una persona (openspec: redesign-artist-page, capability
// `artist-discography-view`): sus grupos, con el período de pertenencia y la cantidad de
// discos principales, enlazados a la página de cada grupo. Sus discos no se mezclan con los
// de la persona.

function usePeriod() {
  const t = useTranslations("catalog.artist.alsoIn");
  const locale = useLocale();
  return (group: AlsoInGroup) => {
    const from = yearOf(group.joinedOn) ?? formatPartialDate(group.joinedOn, locale);
    const to = yearOf(group.leftOn);
    if (from && to) return t("period", { from, to });
    if (from) return t("since", { from });
    if (to) return t("period", { from: "?", to });
    return t("unknownPeriod");
  };
}

export function AlsoIn({ groups }: { groups: AlsoInGroup[] }) {
  const t = useTranslations("catalog.artist.alsoIn");
  const tArtist = useTranslations("catalog.artist");
  const period = usePeriod();
  if (groups.length === 0) return null;

  return (
    <section aria-labelledby="also-in-heading" className="flex flex-col gap-3">
      <h2 id="also-in-heading" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <li key={group.id}>
            <Link
              href={`/artist/${group.id}`}
              className="flex items-center gap-3 rounded border border-ink-border bg-ink-surface p-2 transition-colors hover:border-amber"
            >
              {group.photoUrl ? (
                <span className="relative aspect-[4/3] w-14 shrink-0 overflow-hidden rounded">
                  <AppImage src={group.photoUrl} alt="" fill sizes="56px" className="object-cover" />
                </span>
              ) : (
                <DiscPlaceholder alt={tArtist("noPhotoAlt")} className="aspect-[4/3] w-14 shrink-0" />
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-sm text-paper">{group.name}</span>
                <span className="font-data text-xs text-paper-muted">
                  {period(group)}
                  {group.mainCount !== null ? ` · ${t("mainCount", { count: group.mainCount })}` : ""}
                </span>
              </span>
              <span aria-hidden="true" className="text-paper-muted">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
