import { getTranslations } from "next-intl/server";
import { requirePageUser } from "@/services/auth/page-auth";
import { listFeed, listFeedAuthors } from "@/services/feed/feed";
import { getNetworkConvergence } from "@/services/feed/convergence";
import { getFeedAmbientEvents } from "@/services/feed/ambient";
import { FeedList } from "@/components/feed/FeedList";
import { NetworkConvergence } from "@/components/feed/NetworkConvergence";
import { FeedAmbientStrip } from "@/components/feed/FeedAmbientStrip";

export default async function FeedPage() {
  const t = await getTranslations("feed");
  const user = await requirePageUser();
  const [initial, authors, convergence, ambient] = await Promise.all([
    listFeed(user.id, 1, 20),
    listFeedAuthors(user.id),
    getNetworkConvergence(user.id),
    getFeedAmbientEvents(user.id),
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
      {/* Capa "relevante" (en qué coincide la red) encima de la capa "social"
          (qué hizo cada persona, en orden). Colapsa si no hay convergencia. */}
      <NetworkConvergence items={convergence.items} />
      <FeedList
        initial={initial}
        authors={authors}
        empty={{ title: t("emptyTitle"), description: t("emptyDescription") }}
      />
      {/* Capa "automática" (tier 4): seguir/colección, agrupada y minimizada,
          como coda al pie. Colapsa si no hay eventos. */}
      <FeedAmbientStrip groups={ambient.groups} />
    </main>
  );
}
