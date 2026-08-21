"use client";

import { useTranslations } from "next-intl";
import { useState, type SubmitEventHandler } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { UserSearchResponseSchema, type UserSearchResponse } from "@/lib/api/schemas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { UserCard } from "./UserCard";

interface UserSearchProps {
  authenticated: boolean;
}

// Búsqueda de usuarios como Client Component: la carga inicial la resuelve el
// Server Component de la página y los resultados posteriores se piden por API.
export function UserSearch({ authenticated }: UserSearchProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const [query, setQuery] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [result, setResult] = useState<UserSearchResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const normalized = query.trim();
    if (!normalized) {
      setValidationError(t("searchValidationEmpty"));
      return;
    }
    setValidationError(undefined);
    setApiError(false);
    setSearching(true);
    setSearched(true);
    try {
      const data = await apiFetch(`/api/users?q=${encodeURIComponent(normalized)}`, UserSearchResponseSchema);
      setResult(data);
    } catch (error) {
      setApiError(error instanceof ApiError);
    } finally {
      setSearching(false);
    }
  };

  if (apiError) {
    return (
      <ErrorState
        title={tErrors("INTERNAL_ERROR.title")}
        description={tErrors("INTERNAL_ERROR.description")}
        onRetry={() => setApiError(false)}
        retryLabel={t("searchSubmit")}
      />
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t("searchFieldLabel")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          error={validationError}
          disabled={searching}
          placeholder={t("searchPlaceholder")}
        />
        <Button type="submit" variant="primary" disabled={searching} className="self-start">
          {searching ? t("searching") : t("searchSubmit")}
        </Button>
      </form>

      {searched && !searching && result && result.users.length === 0 && (
        <EmptyState title={t("searchEmptyTitle")} description={t("searchEmptyDescription")} />
      )}

      {result && result.users.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label={t("searchFieldLabel")}>
          {result.users.map((user) => (
            <UserCard key={user.id} user={user} authenticated={authenticated} />
          ))}
        </ul>
      )}
    </div>
  );
}