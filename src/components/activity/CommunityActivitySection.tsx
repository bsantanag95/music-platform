"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { getCommunityActivity, getFeed } from "@/lib/api/diary";
import { getRecentActivity } from "@/lib/api/home";
import { queryKeys } from "@/lib/query/keys";
import type { FeedResponse } from "@/lib/api/schemas";
import { CompactActivityRow } from "@/components/feed/CompactActivityRow";
import { FeedActivityList } from "@/components/feed/FeedActivityList";

const PAGE_SIZE = 10;

export type ActivitySource = "recent" | "from-following" | "own";

const SOURCES = {
  recent: { fetch: getCommunityActivity, queryKey: queryKeys.activityRecent() },
  "from-following": { fetch: getFeed, queryKey: queryKeys.myFeed({}) },
  own: { fetch: getRecentActivity, queryKey: queryKeys.activityOwn() },
} as const satisfies Record<
  ActivitySource,
  { fetch: (page: number, pageSize: number) => Promise<FeedResponse>; queryKey: readonly unknown[] }
>;

interface CommunityActivitySectionProps {
  source: ActivitySource;
  initial: FeedResponse;
  // Encabezado propio: solo lo usa el caso sin sesión (una sola sección,
  // "Recientes", sin pestañas — ver page.tsx). Dentro de ActivityTabs el botón
  // de la pestaña ya cumple ese rol y se omite.
  headingKey?: string;
  // Texto para cuando la página 1 no trae entradas. Solo lo pasa ActivityTabs:
  // con pestañas, un panel vacío sin nada sería confuso al lado de las otras
  // dos con contenido; sin pestañas (headingKey) nunca hace falta porque
  // page.tsx ya omite la sección entera si "Recientes" viene vacío.
  emptyMessage?: string;
}

// Una sección de `/activity` (Recientes, De la gente que seguís, Tu
// actividad). La primera página llega renderizada del servidor; el resto se
// pide por `useInfiniteQuery` contra el endpoint de la fuente — mismo patrón
// que `CommunityListSection` en `/lists`.
export function CommunityActivitySection({
  source,
  initial,
  headingKey,
  emptyMessage,
}: CommunityActivitySectionProps) {
  const t = useTranslations("feed");
  const { fetch, queryKey } = SOURCES[source];

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetch(pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    initialData: { pages: [initial], pageParams: [1] },
    staleTime: 30_000,
  });

  const entries = data?.pages.flatMap((page) => page.entries) ?? initial.entries;
  if (entries.length === 0 && !emptyMessage) return null;

  return (
    <section className="flex w-full flex-col gap-3">
      {headingKey ? <h2 className="font-display text-xl text-paper">{t(headingKey)}</h2> : null}
      {entries.length === 0 ? (
        <p className="font-body text-sm text-paper-muted">{emptyMessage}</p>
      ) : source !== "recent" ? (
        // "De la gente que seguís" es el mismo feed que `/me/feed`, y "Tu
        // actividad" el mismo rastro que "Tu rastro reciente" de Inicio — se
        // reusa su presentación completa (las 6 fuentes, jerarquía por peso)
        // con `clamp`, igual que `FeedList` en `/me/feed`: es una sección de
        // altura libre con "cargar más", no un preview con scroll interno
        // propio (ese caso — `ScrollablePreviewList` de Inicio— deja `clamp`
        // afuera a propósito para no plegar dos veces).
        <FeedActivityList entries={entries} variant={source === "own" ? "self" : "feed"} clamp />
      ) : (
        <ul className="divide-y divide-ink-border">
          {entries.map((entry) =>
            entry.kind === "rating" || entry.kind === "comment" || entry.kind === "review" ? (
              <CompactActivityRow key={`${entry.kind}-${entry.id}`} entry={entry} />
            ) : null,
          )}
        </ul>
      )}

      {isError ? (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      ) : null}
      {hasNextPage ? (
        <Button
          variant="secondary"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
          className="self-center"
        >
          {isFetchingNextPage ? t("loadingMore") : t("loadMore")}
        </Button>
      ) : null}
    </section>
  );
}
