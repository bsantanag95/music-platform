"use client";

import { useState, type SubmitEventHandler } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { searchCatalog } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export function SearchForm() {
  const router = useRouter();
  const t = useTranslations("catalog");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<{
    title: string;
    description: string;
  } | null>(null);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const normalized = query.trim();

    if (!normalized) {
      setValidationError(t("search.validationEmpty"));
      return;
    }

    setValidationError(undefined);
    setNotFound(false);
    setApiError(null);
    setIsSearching(true);

    try {
      const result = await searchCatalog(normalized);
      router.push(`/artist/${result.artist.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ARTIST_NOT_FOUND") {
        setNotFound(true);
      } else {
        setApiError({
          title: tErrors("INTERNAL_ERROR.title"),
          description: tErrors("INTERNAL_ERROR.description"),
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  function handleRetry() {
    setApiError(null);
    setNotFound(false);
  }

  if (notFound) {
    return (
      <EmptyState
        title={tErrors("ARTIST_NOT_FOUND.title")}
        description={tErrors("ARTIST_NOT_FOUND.description")}
        action={
          <Button variant="secondary" onClick={handleRetry}>
            {t("search.searchAgain")}
          </Button>
        }
      />
    );
  }

  if (apiError) {
    return (
      <ErrorState
        title={apiError.title}
        description={apiError.description}
        onRetry={handleRetry}
        retryLabel={tCommon("retry")}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <Input
        label={t("search.fieldLabel")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        error={validationError}
        disabled={isSearching}
        placeholder={t("search.placeholder")}
      />
      <Button type="submit" variant="primary" disabled={isSearching}>
        {isSearching ? t("search.submitting") : t("search.submit")}
      </Button>
      {isSearching && (
        <p className="text-sm text-paper-muted" role="status">
          {t("search.loadingHint")}
        </p>
      )}
    </form>
  );
}
