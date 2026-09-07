import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "@/components/feed/feed-target";
import type { PinnedItem } from "@/services/profiles/showcase";

interface PinnedShowcaseProps {
  pinned: PinnedItem[];
}

// Los cuatro destacados: hasta cuatro carátulas cuadradas grandes "apoyadas
// contra la pared" — lo que esta persona te pondría primero. Server Component.
// Ver spec profile-showcase.
export async function PinnedShowcase({ pinned }: PinnedShowcaseProps) {
  const t = await getTranslations("users");
  if (pinned.length === 0) return null;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("showcase.pinnedHeading")}</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {pinned.map((item) => (
          <li key={item.id}>
            <Link
              href={targetHref(item.entity.type, item.entity.id)}
              className="group flex flex-col gap-2"
            >
              <CoverThumb
                cover={item.entity.coverThumbUrl}
                label=""
                className="aspect-square w-full rounded-lg border border-ink-border transition-colors group-hover:border-amber"
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                  {item.entity.title}
                </span>
                {item.entity.artistName && (
                  <span className="block truncate font-data text-xs text-paper-muted">
                    {item.entity.artistName}
                  </span>
                )}
              </span>
            </Link>
            {item.note && (
              <p className="mt-1 font-body text-xs text-paper-muted">{item.note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
