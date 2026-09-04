"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { FeedActivityList } from "@/components/feed/FeedActivityList";
import { Spinner } from "@/components/ui/Spinner";
import { getFeed } from "@/lib/api/diary";
import { getRecentActivity } from "@/lib/api/home";
import { queryKeys } from "@/lib/query/keys";
import type { FeedEntry } from "@/lib/api/schemas";

const PAGE_SIZE = 10;

interface PreviewPage {
  entries: FeedEntry[];
  page: number;
  hasNext: boolean;
}

interface ScrollablePreviewListProps {
  // "feed": "Tu feed" (actividad de seguidos, pagina contra /api/me/feed).
  // "self": "Tu rastro reciente" (actividad propia, /api/me/recent-activity).
  // No se pasa la función de fetch por props: Server → Client solo puede
  // cruzar datos serializables, así que el componente elige el fetcher según
  // este discriminante (ver design.md, decisión 3).
  source: "feed" | "self";
  initialEntries: FeedEntry[];
  initialHasNext: boolean;
}

// Altura fija por variante, aproximando el alto actual de 5 entradas (no es
// un valor derivado matemáticamente: el alto de fila varía según el peso de
// la entrada — ver design.md, Non-Goals). "feed" trae celda de carátula/disco
// y layout más alto; "self" ya tiene ritmo apretado (ver redesign-feed).
const HEIGHT_BY_SOURCE: Record<ScrollablePreviewListProps["source"], string> = {
  feed: "max-h-[32rem]",
  self: "max-h-[20rem]",
};

async function fetchPage(source: "feed" | "self", page: number): Promise<PreviewPage> {
  const response =
    source === "feed" ? await getFeed(page, PAGE_SIZE) : await getRecentActivity(page, PAGE_SIZE);
  return { entries: response.entries, page: response.page, hasNext: response.hasNext };
}

// Contenedor con scroll interno + carga incremental para los bloques de
// contenido propio de Inicio. La altura no crece al haber más entradas: se
// desplazan dentro del contenedor (scrollbar temática, ver globals.css). Al
// llegar al fondo, un sentinel observado por IntersectionObserver dispara la
// página siguiente — se prefiere sobre escuchar el evento `scroll` porque no
// requiere calcular scrollTop/scrollHeight y es agnóstico al alto real de
// cada fila.
export function ScrollablePreviewList({ source, initialEntries, initialHasNext }: ScrollablePreviewListProps) {
  const t = useTranslations("feed");
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: source === "feed" ? queryKeys.homeFeedPreview() : queryKeys.homeRecentActivity(),
    queryFn: ({ pageParam }) => fetchPage(source, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    // La página 1 ya vino resuelta del servidor: no tiene sentido revalidarla
    // de inmediato al montar (se pediría lo mismo que el SSR acaba de traer).
    staleTime: Infinity,
    initialData: () => ({
      pages: [{ entries: initialEntries, page: 1, hasNext: initialHasNext }],
      pageParams: [1],
    }),
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = containerRef.current;
    if (!sentinel || !root || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (observed) => {
        if (observed[0]?.isIntersecting) void fetchNextPage();
      },
      { root, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const entries = data?.pages.flatMap((page) => page.entries) ?? initialEntries;

  return (
    <div
      ref={containerRef}
      className={`themed-scrollbar overflow-y-auto ${HEIGHT_BY_SOURCE[source]}`}
    >
      <FeedActivityList entries={entries} variant={source} />
      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-3">
          {isFetchingNextPage ? <Spinner label={t("loadingMore")} /> : null}
        </div>
      ) : null}
    </div>
  );
}
