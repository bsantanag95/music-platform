"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type SubmitEventHandler } from "react";
import { useRouter } from "@/i18n/navigation";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  UserSearchResponseSchema,
  type UserSearchResponse,
  type UserSearchResult,
} from "@/lib/api/schemas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { UserCard } from "./UserCard";

interface UserSearchProps {
  authenticated: boolean;
  // Valor con el que llega `/users?q=...`. La página lo lee del `searchParams`
  // (Server Component) y lo pasa acá: prellena el campo y dispara la búsqueda
  // inicial, para que una URL compartida funcione sin redirigir a `/search`.
  initialQuery?: string;
}

// Búsqueda de usuarios como Client Component. El submit actualiza la URL con
// `?q=` (router locale-aware) y pide resultados al endpoint; las páginas
// siguientes se agregan con un botón explícito. El formulario y los resultados
// ya cargados nunca se ocultan ante un error recuperable.
export function UserSearch({ authenticated, initialQuery = "" }: UserSearchProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");

  // Términos ya lanzados por la búsqueda inicial desde props: evita requests
  // duplicadas cuando el `searchParams` re-renderiza el Server Component tras
  // `router.replace` con el mismo `q`.
  const initialRunRef = useRef<string | null>(null);

  const runSearch = useCallback(async (term: string, nextPage: number) => {
    const append = nextPage > 1;
    setActiveQuery(term);
    setErrorCode(null);
    if (append) setLoadingMore(true);
    else setSearching(true);
    try {
      const params = new URLSearchParams({ q: term, page: String(nextPage) });
      const data: UserSearchResponse = await apiFetch(
        `/api/users?${params.toString()}`,
        UserSearchResponseSchema,
      );
      setUsers((prev) => (append ? [...prev, ...data.users] : data.users));
      setPage(data.page);
      setHasNext(data.hasNext);
      setSearched(true);
    } catch (error) {
      // Cualquier excepción no tipada se trata como error interno localizado;
      // nunca se muestra el mensaje crudo del backend.
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
      setSearched(true);
    } finally {
      setSearching(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    const term = initialQuery.trim();
    if (!term || initialRunRef.current === term) return;
    initialRunRef.current = term;
    void runSearch(term, 1);
  }, [initialQuery, runSearch]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      setValidationError(t("searchValidationEmpty"));
      return;
    }
    setValidationError(undefined);
    // Sincronizar la URL antes de buscar: evita que el efecto inicial vuelva a
    // lanzar la misma búsqueda cuando el Server Component re-renderice.
    initialRunRef.current = normalized;
    router.replace(`/users?q=${encodeURIComponent(normalized)}`);
    void runSearch(normalized, 1);
  };

  const handleLoadMore = () => {
    if (!loadingMore && !searching) void runSearch(activeQuery, page + 1);
  };

  const hasResults = users.length > 0;
  const countText = hasNext
    ? t("resultsCountLoaded", { count: users.length })
    : t("resultsCount", { count: users.length });

  return (
    <div className="flex w-full flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface/70 p-4 sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={t("searchFieldLabel")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              error={validationError}
              disabled={searching}
              placeholder={t("searchPlaceholder")}
              className="min-h-11 w-full"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={searching}
            className="min-h-11 w-full shrink-0 sm:w-auto"
          >
            {searching ? t("searching") : t("searchSubmit")}
          </Button>
        </div>
      </form>

      <section
        className="flex w-full flex-col gap-4"
        aria-busy={searching || loadingMore}
      >
        {searching ? (
          <>
            <p className="font-data text-xs text-paper-muted" role="status">
              {t("searchingAria")}
            </p>
            <ul className="flex flex-col gap-3" aria-label={t("searchFieldLabel")}>
              {[0, 1, 2].map((i) => (
                <li
                  key={i}
                  className="flex min-h-20 items-center gap-4 rounded-lg border border-ink-border bg-ink-surface px-4 py-3.5 sm:px-5"
                >
                  <Skeleton className="size-12 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : hasResults ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="min-w-0 break-words font-display text-lg text-paper">
                {t("resultsFor", { query: activeQuery })}
              </h2>
              <span className="shrink-0 font-data text-xs text-paper-muted">{countText}</span>
            </div>
            <ul className="flex flex-col gap-3" aria-label={t("searchFieldLabel")}>
              {users.map((user) => (
                <UserCard key={user.id} user={user} authenticated={authenticated} />
              ))}
            </ul>
            {errorCode ? (
              <div className="flex flex-col items-start gap-2" role="alert">
                <p className="font-body text-sm text-danger">
                  {tErrors(`${errorCode}.description`)}
                </p>
                <Button variant="secondary" onClick={handleLoadMore}>
                  {t("retryLoadMore")}
                </Button>
              </div>
            ) : loadingMore ? (
              <p className="font-data text-xs text-paper-muted" role="status">
                {t("loadingMore")}
              </p>
            ) : hasNext ? (
              <Button variant="secondary" onClick={handleLoadMore} className="self-start">
                {t("loadMore")}
              </Button>
            ) : null}
          </>
        ) : errorCode ? (
          <ErrorState
            title={tErrors(`${errorCode}.title`)}
            description={tErrors(`${errorCode}.description`)}
            onRetry={() => void runSearch(activeQuery, 1)}
            retryLabel={t("searchSubmit")}
          />
        ) : searched ? (
          <EmptyState
            title={t("searchEmptyTitle")}
            description={t("searchEmptyDescription")}
          />
        ) : null}
      </section>
    </div>
  );
}
