"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api/client";
import { UserSearchResponseSchema, type UserSearchResult } from "@/lib/api/schemas";
import { UserCard } from "@/components/social/UserCard";

interface UserResultsProps {
  query: string;
  authenticated: boolean;
  initialUsers: UserSearchResult[];
  initialHasNext: boolean;
}

// Tipo Usuarios del buscador global (openspec: redesign-scoped-search): mismas
// reglas, tarjetas y acción social que `/users`; la primera página llega del
// servidor y las siguientes se agregan sin reemplazar las ya cargadas.
export function UserResults({ query, authenticated, initialUsers, initialHasNext }: UserResultsProps) {
  const t = useTranslations("users");
  const tResults = useTranslations("catalog.search.results");
  const [users, setUsers] = useState(initialUsers);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(initialHasNext);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadMore = async () => {
    if (loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const params = new URLSearchParams({ q: query, page: String(page + 1) });
      const data = await apiFetch(`/api/users?${params.toString()}`, UserSearchResponseSchema);
      setUsers((current) => [...current, ...data.users]);
      setPage(data.page);
      setHasNext(data.hasNext);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" aria-busy={loading}>
      <ul className="flex flex-col gap-3" aria-label={t("searchFieldLabel")}>
        {users.map((user) => (
          <UserCard key={user.id} user={user} authenticated={authenticated} />
        ))}
      </ul>
      {failed ? (
        <p role="alert" className="font-body text-sm text-danger">
          {tResults("loadMoreError")}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="font-data text-xs text-paper-muted">
          {t("loadingMore")}
        </p>
      ) : hasNext ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="self-start rounded border border-ink-border px-4 py-2 font-data text-xs text-paper transition-colors hover:border-amber"
        >
          {failed ? t("retryLoadMore") : t("loadMore")}
        </button>
      ) : null}
    </div>
  );
}
