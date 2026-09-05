"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getUserLists } from "@/lib/api/lists";
import type { ListsListResponse, UserListSummary } from "@/lib/api/schemas";
import { ListCard } from "./ListCard";
import { SaveListButton } from "./SaveListButton";
import { ListsGrid, entityTypeKey } from "./lists-shared";

interface ListsListProps {
  initial: ListsListResponse;
  /** Perfil ajeno cuyo `username` posee estas listas (siempre modo lectura). */
  username: string;
  empty?: { title: string; description: string };
}

// Listas visibles de un perfil ajeno: grilla de tarjetas con mosaico + conteo y
// la acción Guardar/Seguir. La gestión de listas propias vive en /me/lists
// (MyListsTab), no acá.
export function ListsList({ initial, username, empty }: ListsListProps) {
  const t = useTranslations("lists");
  const [lists, setLists] = useState<UserListSummary[]>(initial.lists);
  const [page, setPage] = useState(initial.page);
  const [hasNext, setHasNext] = useState(initial.hasNext);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  if (lists.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? t("profileEmptyTitle")}
        description={empty?.description ?? t("profileEmptyDescription")}
      />
    );
  }

  const handleLoadMore = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await getUserLists(username, page + 1, 20);
      setLists((current) => [...current, ...next.lists]);
      setPage(next.page);
      setHasNext(next.hasNext);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <ListsGrid>
        {lists.map((list) => (
          <ListCard
            key={list.id}
            href={`/users/${encodeURIComponent(username)}/lists/${list.id}`}
            title={list.title}
            coverThumbs={list.coverThumbs}
            description={list.description}
            meta={
              <>
                <span>{t(entityTypeKey(list.entityType))}</span>
                <span aria-hidden>·</span>
                <span>{t("itemsCount", { count: list.itemCount })}</span>
              </>
            }
            action={
              <SaveListButton
                listId={list.id}
                initialSaved={list.saved ?? false}
                initialFollowing={list.following ?? false}
              />
            }
          />
        ))}
      </ListsGrid>

      {hasNext ? (
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => void handleLoadMore()}
          className="self-center"
        >
          {loading ? t("loadingMore") : t("loadMore")}
        </Button>
      ) : null}
      {loadError ? (
        <span role="alert" className="text-center font-data text-xs text-danger">
          {t("loadError")}
        </span>
      ) : null}
    </div>
  );
}
