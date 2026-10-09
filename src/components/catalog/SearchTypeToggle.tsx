"use client";

import type { KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import type { SearchType } from "./search-types";
import { SearchTypeIcon } from "./SearchTypeIcon";

interface SearchTypeToggleProps<T extends SearchType> {
  types: readonly T[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  /** `touch`: áreas táctiles de 44 px en móvil (onboarding). */
  size?: "default" | "touch";
}

// Conmutador compacto de tipo para los buscadores embebidos (registrar una
// escucha, onboarding): la búsqueda por tipo también llega ahí (openspec:
// redesign-scoped-search) — un tipo por solicitud en vez de mezclar álbumes,
// canciones y artistas en cada tecla. Radio group con flechas.
export function SearchTypeToggle<T extends SearchType>({ types, value, onChange, label, size = "default" }: SearchTypeToggleProps<T>) {
  const t = useTranslations("catalog.search.kinds");

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = types[(types.indexOf(value) + step + types.length) % types.length]!;
    onChange(next);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-type="${next}"]`)?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className="flex flex-wrap gap-1.5">
      {types.map((type) => {
        const checked = type === value;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            data-type={type}
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(type)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-data text-xs transition-colors ${
              size === "touch" ? "min-h-11 px-3.5 sm:min-h-0 sm:px-2.5" : ""
            } ${
              checked ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
            }`}
          >
            <SearchTypeIcon type={type} className="size-3" />
            {t(type as SearchType)}
          </button>
        );
      })}
    </div>
  );
}
