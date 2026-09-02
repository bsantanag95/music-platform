"use client";

import { useId, useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { searchCatalog } from "@/lib/api/catalog";

// Entrada de búsqueda compacta y persistente del Header (openspec/specs/header-search).
// A diferencia de SearchForm (src/components/catalog/SearchForm.tsx) no reimplementa sus
// estados de carga lenta/no-encontrado/error — no caben en una franja de header — sino que
// ante cualquier caso que no resuelva de inmediato delega a /search?q=... para que la
// página completa los muestre.
export function HeaderSearch() {
  const router = useRouter();
  const t = useTranslations("catalog");
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;

    setIsSearching(true);
    try {
      const result = await searchCatalog(normalized);
      router.push(`/artist/${result.artist.id}`);
    } catch {
      // No encontrado o error inesperado: ambos casos delegan a /search, que ya sabe
      // mostrar el estado correspondiente (ver design.md de add-header-search).
      router.push(`/search?q=${encodeURIComponent(normalized)}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor={inputId} className="sr-only">
        {t("search.fieldLabel")}
      </label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isSearching}
        placeholder={t("search.placeholder")}
        className="w-36 rounded border border-ink-border bg-ink-surface px-2 py-1.5 font-data text-xs text-paper placeholder:text-paper-muted focus:w-48 focus:outline-none transition-[width]"
      />
      <button
        type="submit"
        disabled={isSearching}
        className="font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:cursor-wait disabled:opacity-60"
      >
        {t("search.submit")}
      </button>
    </form>
  );
}
