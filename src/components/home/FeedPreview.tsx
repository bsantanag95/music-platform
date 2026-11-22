import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ActivityCard, type ActivityCardEntry } from "./ActivityCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { HomeFeedSelection } from "./home-feed-cards";

// «De quienes sigues» (openspec: redesign-signed-in-home-phase2): la actividad de quienes sigues en tarjetas
// —la primera a lo ancho— y, debajo, los eventos de poco valor del mismo tramo resumidos en una línea por
// persona. Muestra un tramo fijo, sin scroll interno ni carga en el lugar: «Ver más actividad» lleva a
// `/me/feed`, donde sigue la paginación. La selección la hace `selectHomeFeedCards`.
export async function FeedPreview({ selection }: { selection: HomeFeedSelection }) {
  const t = await getTranslations("home");
  const { cards, summary } = selection;

  return (
    <section aria-labelledby="home-following" className="flex flex-col gap-6">
      <SectionHeading
        id="home-following"
        title={t("followingTitle")}
        description={t("followingDescription")}
        seeAll={{ href: "/me/feed", label: t("feedPreviewSeeAll") }}
      />

      {cards.length > 0 ? (
        <ul aria-label={t("followingTitle")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            // Mismo dato que el feed del servidor; los tipos del cliente (`lib/api/schemas`) son su espejo.
            <ActivityCard key={`${card.kind}-${card.id}`} entry={card as ActivityCardEntry} wide={index === 0} />
          ))}
        </ul>
      ) : (
        <p className="font-body text-base text-paper-muted">{t("feedPreviewEmpty")}</p>
      )}

      {summary.length > 0 ? (
        <ul className="flex flex-col gap-2 rounded-xl border border-dashed border-ink-border px-4 py-3">
          {summary.map((line) => {
            const name = line.author.displayName ?? `@${line.author.username}`;
            return (
              <li key={line.author.id} className="font-data text-sm text-paper-muted">
                <Link
                  href={`/users/${encodeURIComponent(line.author.username)}`}
                  className="font-medium text-paper transition-colors hover:text-amber"
                >
                  {name}
                </Link>{" "}
                {line.counts.map(({ kind, count }) => t(`feedSummary.${kind}`, { count })).join(" · ")}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex justify-center">
        <Link
          href="/me/feed"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink-border px-5 font-display text-sm font-medium text-paper transition-colors hover:border-amber hover:text-amber"
        >
          {t("followingMore")}
        </Link>
      </div>
    </section>
  );
}
