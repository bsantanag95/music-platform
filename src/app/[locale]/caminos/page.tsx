import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListCoverMosaic } from "@/components/lists/ListCoverMosaic";
import { discoverCaminos } from "@/services/camino/discovery";
import { listGenres } from "@/services/discovery/discovery";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("camino");
  return { title: t("discoveryTitle") };
}

interface CaminosDiscoveryPageProps {
  searchParams: Promise<{ genre?: string; artist?: string }>;
}

// Descubrimiento público de Caminos populares (openspec: add-camino,
// capability camino-discovery): ordenado por conteo de trackeo activo, no
// por guardado simple — vitrina, sin posiciones numeradas ni ranking entre
// usuarios. Filtros por género y artista vía querystring (`?genre=&artist=`),
// para que el resultado filtrado sea enlazable.
export default async function CaminosDiscoveryPage({ searchParams }: CaminosDiscoveryPageProps) {
  const { genre, artist } = await searchParams;
  const t = await getTranslations("camino");
  const tCommon = await getTranslations("common");

  const [result, genres] = await Promise.all([
    discoverCaminos({ genre, artistQuery: artist }, 1, 20),
    listGenres(),
  ]);

  const hasFilters = Boolean(genre || artist);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start gap-8 px-4 py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("discoveryTitle") }]} />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-paper">{t("discoveryTitle")}</h1>
      </div>

      <form method="get" className="flex w-full flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-data text-xs text-paper-muted">{t("filterGenreLabel")}</span>
          <select
            name="genre"
            defaultValue={genre ?? ""}
            className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper"
          >
            <option value="">{t("filterAll")}</option>
            {genres.map((bucket) => (
              <option key={bucket.tag} value={bucket.tag}>
                {bucket.tag}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-data text-xs text-paper-muted">{t("filterArtistLabel")}</span>
          <input
            type="text"
            name="artist"
            defaultValue={artist ?? ""}
            className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-ink-border px-3 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
        >
          {t("applyFilters")}
        </button>
        {hasFilters ? (
          <Link
            href="/caminos"
            className="font-data text-xs text-paper-muted underline decoration-dotted hover:text-paper"
          >
            {t("clearFilters")}
          </Link>
        ) : null}
      </form>

      {result.caminos.length === 0 ? (
        <EmptyState
          title={hasFilters ? t("noResultsTitle") : t("discoveryTitle")}
          description={hasFilters ? t("noResultsDescription") : t("discoveryEmpty")}
        />
      ) : (
        <ul className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {result.caminos.map((camino) => (
            <li key={camino.id}>
              <Link
                href={`/users/${camino.owner.username}/${camino.kind === "custom_journey" ? "caminos" : "lists"}/${camino.id}`}
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
      )}
    </main>
  );
}
