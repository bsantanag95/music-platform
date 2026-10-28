import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthorAvatar } from "./FeedActivityList";
import { NetworkConvergence } from "./NetworkConvergence";
import type { ConvergenceItem, ConvergencePeriod } from "@/services/feed/convergence";
import type { FeedAuthor } from "@/services/feed/feed";

interface FeedContextRailProps {
  convergence: { items: ConvergenceItem[]; period: ConvergencePeriod };
  mostActive: FeedAuthor[];
}

// Riel lateral de `/me/feed` desde `lg` (openspec: redesign-feed-entries, D5): la convergencia de la red y quiénes más
// se movieron esta semana. Cada módulo se oculta sin contenido; sin ninguno, no hay riel. Por debajo de `lg` la página
// muestra la convergencia encima del listado y este riel no se ve.
export async function FeedContextRail({ convergence, mostActive }: FeedContextRailProps) {
  const t = await getTranslations("feed");
  if (convergence.items.length === 0 && mostActive.length === 0) return null;
  // Se resuelve acá (componente de servidor asíncrono) para que el riel siga siendo una sola llamada.
  const convergencePanel = await NetworkConvergence({ items: convergence.items, period: convergence.period, compact: true });

  return (
    <aside aria-label={t("rail.label")} className="hidden w-full flex-col gap-4 lg:flex">
      {convergencePanel}
      {mostActive.length > 0 ? (
        <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
          <h2 className="font-display text-base text-paper">{t("rail.mostActive")}</h2>
          <p className="mt-0.5 font-body text-xs text-paper-muted">{t("rail.mostActiveHint")}</p>
          {/* Sin cifras: la muestra está acotada y una cifra chica delata (D4). */}
          <ol className="mt-3 flex flex-col gap-2">
            {mostActive.map((author) => (
              <li key={author.id}>
                <Link
                  href={`/me/feed?author=${encodeURIComponent(author.username)}`}
                  className="flex items-center gap-2.5 font-data text-sm text-paper transition-colors hover:text-amber"
                >
                  <AuthorAvatar author={author} />
                  <span className="truncate">{author.displayName ?? `@${author.username}`}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </aside>
  );
}
