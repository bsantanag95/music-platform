import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listFeed, listFeedAuthors } from "@/services/feed/feed";
import { getNetworkConvergence } from "@/services/feed/convergence";
import { FeedList } from "@/components/feed/FeedList";
import { NetworkConvergence } from "@/components/feed/NetworkConvergence";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
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
  const authors = await listFeedAuthors(user.id);

  // Filtros de la URL (refine-feed-page-phase1, D2): un `kind` fuera del enum o un `author` que no es un seguido
  // aceptado se ignoran en vez de responder un error — es un enlace viejo o editado a mano, no una petición inválida.
  const kindParam = param(params.kind);
  const kind = (FEED_KINDS as readonly string[]).includes(kindParam) ? (kindParam as FeedKind) : undefined;
  const author = authors.find((candidate) => candidate.username === param(params.author));
  const q = param(params.q).trim();

  const [initial, convergence] = await Promise.all([
    listFeed(user.id, 1, 20, { kind, authorId: author?.id, q: q || undefined }),
    getNetworkConvergence(user.id),
  ]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("title") }]} />
      <header className="-mt-2 flex flex-col gap-1 sm:-mt-4">
        <h1 className="font-display text-3xl text-paper">{t("title")}</h1>
        <p className="font-body text-sm text-paper-muted">{t("subtitle")}</p>
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
      />
    </main>
  );
}
