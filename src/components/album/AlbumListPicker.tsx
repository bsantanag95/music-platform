"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { CaminoForm } from "@/components/camino/CaminoForm";
import { ListForm } from "@/components/lists/ListForm";
import { addAlbumToCamino, getMyCaminos, removeAlbumFromCamino } from "@/lib/api/camino";
import { ApiError } from "@/lib/api/client";
import { addItemToList, getMyLists, removeItemFromList } from "@/lib/api/lists";
import type { CaminoDetail, ListsListResponse, UserListDetail } from "@/lib/api/schemas";
import { queryKeys } from "@/lib/query/keys";

// Selector de listas y Caminos propios del panel "Tu relación" (openspec:
// rework-album-relation-panel, capability `album-list-picker`, D2). Casillas marcadas =
// el álbum ya está; marcar agrega y desmarcar quita, con actualización optimista. La
// pertenencia inicial llega del servidor, así que una lista vieja aparece marcada aunque
// quede fuera de la primera página; el resto se busca en el servidor con `q`, sin el tope
// silencioso de 50 del `AddToListPanel` de otras superficies.

export interface PickerMembership {
  listId: string;
  /** Ítem de la lista, necesario para quitarlo; los Caminos se quitan por álbum. */
  itemId: string | null;
  kind: "standard" | "custom_journey";
  title: string;
}

interface AlbumListPickerProps {
  releaseGroupId: string;
  memberships: PickerMembership[];
  /** Recibe una función de actualización: varias casillas pueden estar en vuelo a la vez. */
  onMembershipsChange: (update: (current: PickerMembership[]) => PickerMembership[]) => void;
  onClose: () => void;
}

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 250;

interface Row {
  id: string;
  title: string;
  kind: PickerMembership["kind"];
}

function matches(title: string, query: string): boolean {
  return title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

export function AlbumListPicker({ releaseGroupId, memberships, onMembershipsChange, onClose }: AlbumListPickerProps) {
  const t = useTranslations("catalog.album.relation.picker");
  const target = { type: "release-group" as const, id: releaseGroupId };

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState<"list" | "camino" | null>(null);
  // Filas fijadas arriba: la pertenencia al abrir más lo creado ahora. Desmarcar una no la
  // mueve de lugar, para que el usuario pueda volver a marcarla.
  const [pinned, setPinned] = useState<Row[]>(() =>
    memberships.map((m) => ({ id: m.listId, title: m.title, kind: m.kind })),
  );

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const filters = { entityType: "release-group" as const, ...(debouncedQuery ? { q: debouncedQuery } : {}) };
  const listsQuery = useInfiniteQuery<ListsListResponse, ApiError, { pages: ListsListResponse[] }, readonly unknown[], number>({
    queryKey: queryKeys.myListsPicker(filters),
    queryFn: ({ pageParam }) => getMyLists(pageParam, PAGE_SIZE, filters),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const caminosQuery = useQuery({ queryKey: queryKeys.myCaminos(), queryFn: getMyCaminos });

  const memberIds = useMemo(() => new Set(memberships.map((m) => m.listId)), [memberships]);
  const pinnedIds = useMemo(() => new Set(pinned.map((row) => row.id)), [pinned]);

  const listRows = useMemo(() => {
    const fetched = (listsQuery.data?.pages ?? [])
      .flatMap((page) => page.lists)
      .filter((list) => !pinnedIds.has(list.id))
      .map((list): Row => ({ id: list.id, title: list.title, kind: "standard" }));
    return [...pinned.filter((row) => row.kind === "standard" && matches(row.title, debouncedQuery)), ...fetched];
  }, [listsQuery.data, pinned, pinnedIds, debouncedQuery]);

  const caminoRows = useMemo(() => {
    const active = (caminosQuery.data?.caminos ?? [])
      .filter((camino) => camino.state !== "archived" && !pinnedIds.has(camino.id))
      .map((camino): Row => ({ id: camino.id, title: camino.title, kind: "custom_journey" }));
    return [...pinned.filter((row) => row.kind === "custom_journey"), ...active].filter((row) =>
      matches(row.title, debouncedQuery),
    );
  }, [caminosQuery.data, pinned, pinnedIds, debouncedQuery]);

  function setBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function add(row: Row): Promise<PickerMembership> {
    if (row.kind === "standard") {
      const detail = await addItemToList(row.id, target);
      const item = detail.items.find((candidate) => candidate.target.id === releaseGroupId);
      return { listId: row.id, itemId: item?.id ?? null, kind: row.kind, title: row.title };
    }
    await addAlbumToCamino(row.id, releaseGroupId);
    return { listId: row.id, itemId: null, kind: row.kind, title: row.title };
  }

  async function toggle(row: Row) {
    if (busyIds.has(row.id)) return;
    const current = memberships.find((m) => m.listId === row.id);
    setBusy(row.id, true);
    setError(false);
    const without = (list: PickerMembership[]) => list.filter((m) => m.listId !== row.id);
    // Optimista: la casilla cambia ya y se revierte si la operación falla.
    onMembershipsChange((list) =>
      current ? without(list) : [...without(list), { listId: row.id, itemId: null, kind: row.kind, title: row.title }],
    );
    try {
      if (current) {
        if (current.kind === "standard") {
          if (!current.itemId) throw new Error("Falta el ítem de la lista");
          await removeItemFromList(current.listId, current.itemId);
        } else {
          await removeAlbumFromCamino(current.listId, releaseGroupId);
        }
      } else {
        const added = await add(row);
        onMembershipsChange((list) => [...without(list), added]);
      }
    } catch {
      onMembershipsChange((list) => (current ? [...without(list), current] : without(list)));
      setError(true);
    } finally {
      setBusy(row.id, false);
    }
  }

  async function created(row: Row) {
    setCreating(null);
    setPinned((current) => [row, ...current]);
    setBusy(row.id, true);
    setError(false);
    try {
      const added = await add(row);
      onMembershipsChange((list) => [...list.filter((m) => m.listId !== row.id), added]);
    } catch {
      setError(true);
    } finally {
      setBusy(row.id, false);
    }
  }

  const renderRow = (row: Row) => (
    <li key={row.id}>
      <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 py-1.5 font-data text-sm text-paper hover:bg-ink has-[:disabled]:cursor-wait has-[:disabled]:opacity-60">
        <input
          type="checkbox"
          checked={memberIds.has(row.id)}
          disabled={busyIds.has(row.id)}
          onChange={() => void toggle(row)}
          className="size-4 shrink-0 accent-amber"
        />
        <span className="min-w-0 truncate">{row.title}</span>
      </label>
    </li>
  );

  return (
    <div
      role="group"
      aria-label={t("label")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      className="flex w-full flex-col gap-2 rounded border border-ink-border bg-ink p-2"
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("search")}
        aria-label={t("search")}
        className="w-full rounded border border-ink-border bg-ink-surface px-2 py-1.5 font-data text-sm text-paper placeholder:text-paper-muted"
      />

      <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
        <Section
          title={t("lists")}
          action={t("newList")}
          actionLabel={t("newListLabel")}
          onAction={() => setCreating(creating === "list" ? null : "list")}
          expanded={creating === "list"}
        >
          {creating === "list" && (
            <ListForm
              fixedEntityType="release-group"
              onCreated={(list: UserListDetail) => void created({ id: list.id, title: list.title, kind: "standard" })}
              onCancel={() => setCreating(null)}
            />
          )}
          {listRows.length > 0 && <ul className="flex flex-col">{listRows.map(renderRow)}</ul>}
          {/* Mientras carga, las pertenencias ya se ven: el aviso evita que parezcan ser todas. */}
          {listsQuery.isError ? (
            <p className="px-2 font-data text-xs text-danger">{t("loadError")}</p>
          ) : listsQuery.isPending ? (
            <p className="px-2 font-data text-xs text-paper-muted">{t("loading")}</p>
          ) : listRows.length > 0 ? null : (
            <p className="px-2 font-data text-xs text-paper-muted">
              {debouncedQuery ? t("noMatches", { query: debouncedQuery }) : t("noLists")}
            </p>
          )}
          {listsQuery.hasNextPage && (
            <button
              type="button"
              disabled={listsQuery.isFetchingNextPage}
              onClick={() => void listsQuery.fetchNextPage()}
              className="self-start px-2 font-data text-xs text-amber hover:underline disabled:opacity-50"
            >
              {listsQuery.isFetchingNextPage ? t("loading") : t("loadMore")}
            </button>
          )}
        </Section>

        <Section
          title={t("caminos")}
          action={t("newCamino")}
          actionLabel={t("newCaminoLabel")}
          onAction={() => setCreating(creating === "camino" ? null : "camino")}
          expanded={creating === "camino"}
        >
          {creating === "camino" && (
            <CaminoForm
              onCreated={(camino: CaminoDetail) =>
                void created({ id: camino.id, title: camino.title, kind: "custom_journey" })
              }
              onCancel={() => setCreating(null)}
            />
          )}
          {caminoRows.length > 0 && <ul className="flex flex-col">{caminoRows.map(renderRow)}</ul>}
          {caminosQuery.isPending ? (
            <p className="px-2 font-data text-xs text-paper-muted">{t("loading")}</p>
          ) : caminoRows.length > 0 ? null : (
            <p className="px-2 font-data text-xs text-paper-muted">
              {debouncedQuery ? t("noMatches", { query: debouncedQuery }) : t("noCaminos")}
            </p>
          )}
        </Section>
      </div>

      {error && (
        <p role="alert" className="px-2 font-data text-xs text-danger">
          {t("saveError")}
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="self-end rounded px-2 py-1 font-data text-xs text-amber hover:underline"
      >
        {t("done")}
      </button>
    </div>
  );
}

function Section({
  title,
  action,
  actionLabel,
  onAction,
  expanded,
  children,
}: {
  title: string;
  action: string;
  actionLabel: string;
  onAction: () => void;
  expanded: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2">
        <h3 className="font-data text-xs uppercase tracking-wider text-paper-muted">{title}</h3>
        <button
          type="button"
          aria-label={actionLabel}
          aria-expanded={expanded}
          onClick={onAction}
          className="font-data text-xs text-amber hover:underline"
        >
          {action}
        </button>
      </div>
      {children}
    </section>
  );
}
