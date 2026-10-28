"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "@/i18n/navigation";
import { getCommunityActivity, getFeed } from "@/lib/api/diary";
import { getRecentActivity } from "@/lib/api/home";
import { queryKeys } from "@/lib/query/keys";
import type { CommunityActivityKind, FeedKind, FeedResponse } from "@/lib/api/schemas";
import { FeedActivityList } from "@/components/feed/FeedActivityList";
import { FeedKindChips } from "@/components/feed/FeedKindChips";
import { ACTIVITY_FILTER_KINDS, kindFromParam, type ActivitySource } from "./activity-tab-param";

export const ACTIVITY_PAGE_SIZE = 10;

export type { ActivitySource };

// Clave y función de cada fuente con su filtro de tipo (redesign-activity-page, D3): el `kind` es parte de la key, así
// cada combinación pagina por separado. "Tú" no filtra.
function sourceQuery(source: ActivitySource, kind: FeedKind | undefined) {
  switch (source) {
    case "recent": {
      // `kindFromParam` ya acotó el valor a los tipos de esta fuente.
      const filters = kind ? { kind: kind as CommunityActivityKind } : {};
      return {
        queryKey: queryKeys.activityRecent(filters),
        fetch: (page: number, pageSize: number) => getCommunityActivity(page, pageSize, filters),
      };
    }
    case "from-following": {
      const filters = kind ? { kind } : {};
      return {
        queryKey: queryKeys.myFeed(filters),
        fetch: (page: number, pageSize: number) => getFeed(page, pageSize, filters),
      };
    }
    case "own":
      return { queryKey: queryKeys.activityOwn(), fetch: getRecentActivity };
  }
}

// Opciones de `useInfiniteQuery` de una fuente, compartidas con el prefetch de `ActivityTabs` (al pasar el mouse o
// enfocar una pestaña): misma clave y misma función, para que el prefetch caliente exactamente la query que monta el
// panel.
export function activityQueryOptions(source: ActivitySource, kind?: FeedKind) {
  const { fetch, queryKey } = sourceQuery(source, kind);
  return {
    queryKey: queryKey as readonly unknown[],
    queryFn: ({ pageParam }: { pageParam: number }) => fetch(pageParam, ACTIVITY_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (last: FeedResponse) => (last.hasNext ? last.page + 1 : undefined),
    staleTime: 30_000,
  };
}

// Estado vacío de un panel (redesign-activity-page, D9): siempre con una salida, nunca un mensaje suelto.
export interface ActivityEmpty {
  title: string;
  description: string;
  action?: { label: string; href: string };
}

interface CommunityActivitySectionProps {
  source: ActivitySource;
  // Primera página renderizada en el servidor. Solo la trae la pestaña que llegó en la URL; las demás se piden en el
  // cliente al elegirlas (ver page.tsx) y muestran un esqueleto mientras tanto.
  initial?: FeedResponse;
  // Filtro con el que el servidor pidió `initial`. La página inicial solo siembra la query de ese mismo filtro: si no,
  // al elegir un chip la lista sin filtrar se mostraría como si fuera la filtrada.
  initialKind?: FeedKind;
  // Encabezado propio: solo lo usa el caso sin sesión (una sola sección,
  // "Recientes", sin pestañas — ver page.tsx). Dentro de ActivityTabs el botón
  // de la pestaña ya cumple ese rol y se omite.
  headingKey?: string;
  // Estado vacío del panel. Solo lo pasa ActivityTabs: con pestañas, un panel vacío sin nada sería confuso al lado de
  // las otras dos con contenido; sin pestañas (headingKey) nunca hace falta porque page.tsx ya omite la sección entera
  // si "Recientes" viene vacío.
  empty?: ActivityEmpty;
}

// Una sección de `/activity` (Recientes, Siguiendo, Tú). La primera página llega renderizada del servidor cuando es
// la pestaña de la URL; el resto se pide por `useInfiniteQuery` contra el endpoint de la fuente — mismo patrón que
// `CommunityListSection` en `/lists`. El filtro de tipo vive en `?kind=` y, como la pestaña, se deriva de
// `useSearchParams` y se escribe con `history.replaceState`.
export function CommunityActivitySection({
  source,
  initial,
  initialKind,
  headingKey,
  empty,
}: CommunityActivitySectionProps) {
  const t = useTranslations("feed");
  const searchParams = useSearchParams();
  const kind = kindFromParam(source, searchParams.get("kind"));
  const kinds: readonly FeedKind[] = ACTIVITY_FILTER_KINDS[source];

  const setKind = (next: FeedKind | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("kind", next);
    else params.delete("kind");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, isError, isPending } = useInfiniteQuery({
    ...activityQueryOptions(source, kind),
    ...(initial && kind === initialKind ? { initialData: { pages: [initial], pageParams: [1] } } : {}),
  });

  const entries = data?.pages.flatMap((page) => page.entries) ?? [];
  if (!isPending && entries.length === 0 && !empty && !kind && !isError) return null;

  return (
    <section className="flex w-full flex-col gap-3">
      {headingKey ? <h2 className="font-display text-xl text-paper">{t(headingKey)}</h2> : null}
      {kinds.length > 0 ? <FeedKindChips kinds={kinds} active={kind} onChange={setKind} /> : null}

      {isPending ? (
        <ActivitySkeleton label={t("loadingMore")} />
      ) : entries.length === 0 && kind ? (
        // Un filtro sin resultados ofrece volver a todo, no un callejón sin salida.
        <EmptyState
          compact
          title={t("community.emptyFiltered.title")}
          description={t("community.emptyFiltered.description")}
          action={
            <Button variant="secondary" onClick={() => setKind(undefined)} className="mt-1">
              {t("community.emptyFiltered.action")}
            </Button>
          }
        />
      ) : entries.length === 0 && empty ? (
        <EmptyState
          compact
          title={empty.title}
          description={empty.description}
          action={
            empty.action ? (
              <Link
                href={empty.action.href}
                className="mt-1 inline-flex items-center justify-center rounded border border-ink-border bg-ink-surface px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
              >
                {empty.action.label}
              </Link>
            ) : undefined
          }
        />
      ) : entries.length > 0 ? (
        // Las tres pestañas con la misma anatomía (carátula a la izquierda): "Tú" usa `own`, que es la de `feed` sin
        // autor, en vez del riel `self` de Inicio — al cambiar de pestaña la misma valoración se veía de dos formas
        // distintas. `clamp` como en `/me/feed`: sección de altura libre con "cargar más", no un preview con scroll
        // propio. Bloques de fecha y tarjeta de reseña solo acá (D7, D8): `/me/feed` conserva su presentación.
        <FeedActivityList
          entries={entries}
          variant={source === "own" ? "own" : "feed"}
          clamp
          dateSections
          reviewCard
        />
      ) : null}

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

// Tres filas con la silueta de una entrada (celda + dos líneas) mientras llega la primera página de una pestaña que
// no vino del servidor. Un solo `role="status"` para todo el bloque: cada `Skeleton` trae el suyo y anidados se
// anunciarían varias veces.
function ActivitySkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex w-full flex-col gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} aria-hidden="true" className="flex gap-3 sm:gap-4">
          <div className="size-11 shrink-0 animate-pulse rounded bg-ink-surface sm:size-12" />
          <div className="flex flex-1 flex-col gap-2 pt-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-ink-surface" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-ink-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}
