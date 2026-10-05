import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { genrePageHref, type GenrePageParams } from "@/services/genres/page-params";
import type { GenreDecade } from "@/services/genres/stats";

// Distribución de álbumes por década (openspec: redesign-genre-page, capability `genre-page-overview`).
// Barras horizontales de CSS dentro de una lista de enlaces: la lista es la alternativa textual (cada
// fila dice la década y la cantidad) y cada una lleva a la pestaña Álbumes filtrada por esa década.
// El servicio devuelve `[]` con menos de dos décadas, y entonces no se renderiza nada.

interface GenreDecadeBarsProps {
  slug: string;
  params: GenrePageParams;
  /** De la más reciente a la más antigua. */
  decades: GenreDecade[];
}

export function GenreDecadeBars({ slug, params, decades }: GenreDecadeBarsProps) {
  const t = useTranslations("catalog.genres.page.decades");
  if (decades.length === 0) return null;
  const max = Math.max(...decades.map((d) => d.count));

  return (
    <section aria-labelledby="genre-decades-heading" className="flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-4">
      <h2 id="genre-decades-heading" className="font-display text-lg text-paper">
        {t("heading")}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {decades.map((d) => (
          <li key={d.decade}>
            <Link
              href={genrePageHref(slug, params, { tab: "albums", decade: d.decade, page: 1 })}
              aria-label={t("barLabel", { decade: d.decade, count: d.count })}
              className="group grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-2 font-data text-xs text-paper-muted"
            >
              <span className="group-hover:text-paper">{d.decade}s</span>
              <span aria-hidden="true" className="h-2 rounded-sm bg-ink-border">
                <span
                  className="block h-full rounded-sm bg-amber transition-opacity group-hover:opacity-80"
                  style={{ width: `${Math.max(4, Math.round((d.count / max) * 100))}%` }}
                />
              </span>
              <span aria-hidden="true" className="text-right tabular-nums">
                {d.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
