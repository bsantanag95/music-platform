import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import {
  getFeedSeenAt,
  listAuthorsWithNewActivity,
  listFeed,
  listFeedAuthors,
  listMostActiveAuthors,
} from "@/services/feed/feed";
import { getNetworkConvergenceWithFallback } from "@/services/feed/convergence";
import { FeedList } from "@/components/feed/FeedList";
import { NetworkConvergence } from "@/components/feed/NetworkConvergence";
import { FeedContextRail } from "@/components/feed/FeedContextRail";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Link } from "@/i18n/navigation";
import { FEED_KINDS, type FeedKind } from "@/lib/api/schemas";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed");
  return { title: t("title") };
}

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function FeedPage({ searchParams }: { searchParams: SearchParams }) {
  const t = await getTranslations("feed");
  const tCommon = await getTranslations("common");
  const user = await requirePageUser();
  const params = await searchParams;
  const [authors, lastVisitAt] = await Promise.all([listFeedAuthors(user.id), getFeedSeenAt(user.id)]);

  // Filtros de la URL (refine-feed-page-phase1, D2): un `kind` fuera del enum o un `author` que no es un seguido
  // aceptado se ignoran en vez de responder un error — es un enlace viejo o editado a mano, no una petición inválida.
  const kindParam = param(params.kind);
  const kind = (FEED_KINDS as readonly string[]).includes(kindParam) ? (kindParam as FeedKind) : undefined;
  const author = authors.find((candidate) => candidate.username === param(params.author));
  const q = param(params.q).trim();

  // Sin visita anterior no hay novedades que marcar (redesign-feed-people, D3).
  const [initial, convergence, authorsWithNews, mostActive] = await Promise.all([
    listFeed(user.id, 1, 20, { kind, authorId: author?.id, q: q || undefined }),
    getNetworkConvergenceWithFallback(user.id),
    lastVisitAt ? listAuthorsWithNewActivity(user.id, lastVisitAt) : Promise.resolve([]),
    listMostActiveAuthors(user.id),
  ]);
  const filters = { kind: kind ?? ("" as const), author: author?.username ?? "", q };
  // Sin módulos en el riel, la página conserva el ancho de lectura en vez de dejar una columna vacía (D5).
  const hasRail = convergence.items.length > 0 || mostActive.length > 0;

  return (
    <main
      className={`mx-auto flex min-h-screen w-full ${hasRail ? "max-w-6xl" : "max-w-3xl"} flex-col gap-6 px-4 py-8 sm:py-12`}
    >
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("title") }]} />
      <header className="-mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:-mt-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
          <p className="font-body text-sm text-paper-muted">{t("subtitle")}</p>
        </div>
        {/* Salida a toda la comunidad (redesign-feed-people): este feed es solo la gente que sigues. */}
        <Link
          href="/activity"
          className="font-data text-xs text-paper underline decoration-ink-border underline-offset-4 transition-colors hover:text-amber hover:decoration-amber"
        >
          {t("communityLink")}
        </Link>
      </header>
      {/* Riel lateral desde `lg` (redesign-feed-entries, D5); el listado conserva su ancho de lectura. */}
      <div
        className={`grid w-full grid-cols-1 gap-10 ${hasRail ? "lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12" : ""}`}
      >
        <div className="flex min-w-0 max-w-3xl flex-col gap-6">
          {/* Capa "relevante" (en qué coincide la red) encima de la capa "social" (qué hizo cada persona, en orden),
              solo por debajo de `lg`: desde ahí va en el riel. Colapsa si no hay convergencia. */}
          <div className="lg:hidden">
            <NetworkConvergence items={convergence.items} period={convergence.period} />
          </div>
          {/* `key` con los filtros de la URL: elegir a una persona en el riel navega y reinicia el listado (D4). */}
          <FeedList
            key={`${filters.kind}|${filters.author}|${filters.q}`}
            initial={initial}
            authors={authors}
            initialFilters={filters}
            lastVisitAt={lastVisitAt}
            authorsWithNews={authorsWithNews}
          />
        </div>
        <FeedContextRail convergence={convergence} mostActive={mostActive} />
      </div>
    </main>
  );
}
