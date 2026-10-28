import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { getFeedSeenAt, listAuthorsWithNewActivity, listFeed, listFeedAuthors } from "@/services/feed/feed";
import { getNetworkConvergence } from "@/services/feed/convergence";
import { FeedList } from "@/components/feed/FeedList";
import { NetworkConvergence } from "@/components/feed/NetworkConvergence";
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
  const [initial, convergence, authorsWithNews] = await Promise.all([
    listFeed(user.id, 1, 20, { kind, authorId: author?.id, q: q || undefined }),
    getNetworkConvergence(user.id),
    lastVisitAt ? listAuthorsWithNewActivity(user.id, lastVisitAt) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
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
      {/* Capa "relevante" (en qué coincide la red) encima de la capa "social"
          (qué hizo cada persona, en orden). Colapsa si no hay convergencia.
          La franja ambiente que cerraba la página se retiró: su única fuente,
          las altas de colección, vive ahora en el listado (expand-feed-coverage). */}
      <NetworkConvergence items={convergence.items} />
      <FeedList
        initial={initial}
        authors={authors}
        initialFilters={{ kind: kind ?? "", author: author?.username ?? "", q }}
        lastVisitAt={lastVisitAt}
        authorsWithNews={authorsWithNews}
      />
    </main>
  );
}
