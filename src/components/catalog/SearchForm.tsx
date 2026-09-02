"use client";

import { useEffect, useRef, useState, type SubmitEventHandler } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { searchCatalog } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

// Una primera importación (búsqueda de artista + discografía, con rate limit
// de MusicBrainz ≥1.1s por request) tarda ~2.5-3s; un artista cacheado en
// Postgres responde en <100ms. La duración del request es el discriminador
// para saber si conviene mostrar el aviso de "primera importación".
const SLOW_REQUEST_THRESHOLD_MS = 3000;

interface SearchFormProps {
  // Valor con el que llega `/search?q=...` (típicamente desde HeaderSearch cuando no pudo
  // resolver la búsqueda en el propio Header) — se autoejecuta una sola vez al montar.
  initialQuery?: string;
}

export function SearchForm({ initialQuery }: SearchFormProps = {}) {
  const router = useRouter();
  const t = useTranslations("catalog");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState(initialQuery ?? "");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [slowRequest, setSlowRequest] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const slowRequestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRanRef = useRef(false);

  useEffect(() => {
    return () => {
      if (slowRequestTimerRef.current) {
        clearTimeout(slowRequestTimerRef.current);
      }
    };
  }, []);

  const runSearch = async (normalized: string) => {
    setValidationError(undefined);
    setNotFound(false);
    setApiError(null);
    setIsSearching(true);
    setSlowRequest(false);

    slowRequestTimerRef.current = setTimeout(
      () => setSlowRequest(true),
      SLOW_REQUEST_THRESHOLD_MS,
    );

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
      if (slowRequestTimerRef.current) {
        clearTimeout(slowRequestTimerRef.current);
        slowRequestTimerRef.current = null;
      }
      setIsSearching(false);
    }
  };

  // Autoejecuta una única vez cuando llega con `initialQuery` (típicamente el fallback de
  // HeaderSearch a /search?q=...) — no vuelve a dispararse en renders posteriores.
  useEffect(() => {
    const normalized = initialQuery?.trim();
    if (!normalized || autoRanRef.current) return;
    autoRanRef.current = true;
    void runSearch(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const normalized = query.trim();

    if (!normalized) {
      setValidationError(t("search.validationEmpty"));
      return;
    }

    await runSearch(normalized);
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
          {slowRequest ? t("search.loadingHint") : t("search.loading")}
        </p>
      )}
    </form>
  );
}
