"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { searchCatalog } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const ERROR_MESSAGES = {
  ARTIST_NOT_FOUND: {
    title: "No se encontró el artista",
    description: "Probá con otro nombre o verificá que esté bien escrito.",
  },
  INTERNAL_ERROR: {
    title: "Error inesperado",
    description: "No pudimos completar la búsqueda. Intentá de nuevo en un momento.",
  },
} as const;

export function SearchForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [apiError, setApiError] = useState<{ title: string; description: string } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const normalized = query.trim();

    if (!normalized) {
      setValidationError("Ingresá un nombre para buscar.");
      return;
    }

    setValidationError(undefined);
    setNotFound(false);
    setApiError(null);
    setIsSearching(true);

    try {
      const result = await searchCatalog(normalized);
      router.push(`/artista/${result.artist.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ARTIST_NOT_FOUND") {
        setNotFound(true);
      } else {
        setApiError(ERROR_MESSAGES.INTERNAL_ERROR);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function handleRetry() {
    setApiError(null);
    setNotFound(false);
  }

  if (notFound) {
    return (
      <EmptyState
        title={ERROR_MESSAGES.ARTIST_NOT_FOUND.title}
        description={ERROR_MESSAGES.ARTIST_NOT_FOUND.description}
        action={
          <Button variant="secondary" onClick={handleRetry}>
            Buscar otro artista
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
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md">
      <Input
        label="Buscar artista"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        error={validationError}
        disabled={isSearching}
        placeholder="Ej: Pink Floyd"
      />
      <Button type="submit" variant="primary" disabled={isSearching}>
        {isSearching ? "Buscando..." : "Buscar"}
      </Button>
      {isSearching && (
        <p className="text-sm text-paper-muted" role="status">
          Estamos importando este artista por primera vez. Puede tardar unos segundos...
        </p>
      )}
    </form>
  );
}
