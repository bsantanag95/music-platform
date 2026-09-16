"use client";

import { useId, useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

// Entrada de búsqueda compacta y persistente del Header (openspec/specs/header-search).
// Siempre delega a /search?q=...: la búsqueda resuelve una lista de candidatos
// (artistas + álbumes), así que ya no existe "el artista resuelto" al que
// navegar desde el propio Header.
export function HeaderSearch() {
  const router = useRouter();
  const t = useTranslations("catalog");
  const inputId = useId();
  const [query, setQuery] = useState("");

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;

    router.push(`/search?q=${encodeURIComponent(normalized)}`);
    // El Header persiste entre navegaciones (vive en el layout, no se
    // desmonta), así que sin esto el texto de la última búsqueda quedaba
    // pegado en el campo para siempre, aunque el visitante ya hubiera
    // navegado a otra sección — la página /search tiene su propio campo
    // (`SearchForm`, inicializado desde `?q=`), así que este solo dispara la
    // navegación y puede volver a quedar vacío de inmediato.
    setQuery("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center">
      <label htmlFor={inputId} className="sr-only">
        {t("search.fieldLabel")}
      </label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("search.placeholder")}
        className="w-36 rounded border border-ink-border bg-ink-surface py-1.5 pl-2 pr-7 font-data text-xs text-paper placeholder:text-paper-muted transition-[width] focus:w-48"
      />
      <button
        type="submit"
        aria-label={t("search.submit")}
        className="absolute right-1.5 flex items-center justify-center text-paper-muted transition-colors hover:text-paper"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
    </form>
  );
}
