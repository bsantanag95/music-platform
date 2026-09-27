"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FocusEvent,
  type KeyboardEvent,
  type SubmitEventHandler,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getSearchSuggestions } from "@/lib/api/catalog";
import type { SearchSuggestion } from "@/lib/api/schemas";
import { UserAvatar } from "@/components/social/UserAvatar";
import { SEARCH_TYPES, searchHref, type SearchType } from "./search-types";
import { SearchTypeIcon } from "./SearchTypeIcon";

const SUGGEST_DEBOUNCE_MS = 150;
const MIN_SUGGEST_LENGTH = 2;

interface ScopedSearchFieldProps {
  /** `compact`: Header. `full`: página /search, con label visible y botón. */
  variant: "compact" | "full";
  initialType?: SearchType;
  initialQuery?: string;
  /** Header: tras navegar el campo se vacía y el tipo vuelve a Artistas. */
  resetAfterNavigate?: boolean;
  /** Ocupa todo el ancho disponible (Header en el panel móvil). */
  fluid?: boolean;
  /** Aviso de una búsqueda enviada (búsquedas recientes de /search). */
  onSubmitSearch?: (query: string, type: SearchType) => void;
}

type Option =
  | { kind: "suggestion"; suggestion: SearchSuggestion; href: string }
  | { kind: "seeAll"; href: string };

function suggestionHref(suggestion: SearchSuggestion): string {
  switch (suggestion.kind) {
    case "artist":
      return `/artist/${suggestion.id}`;
    case "album":
      return `/album/${suggestion.id}`;
    case "song":
      return searchHref(
        "song",
        suggestion.artistName ? `${suggestion.artistName} - ${suggestion.title}` : suggestion.title,
      );
    case "user":
      return `/users/${encodeURIComponent(suggestion.username)}`;
  }
}

// Buscador con el TIPO dentro del campo (openspec: redesign-scoped-search,
// capacidades search-scopes y search-typeahead). Los dos pasos de Metal
// Archives (tipo + texto) se sienten como uno: el tipo por defecto es
// Artistas, las sugerencias locales aparecen mientras se escribe (sin
// MusicBrainz) y cambiar de tipo es un clic sin reescribir.
//
// Sin TanStack Query a propósito: el Header vive fuera de `<Providers>`, así
// que no hay QueryClientProvider en su árbol (mismo criterio que
// `RegisterListenDialog`). Debounce + AbortController a mano.
export function ScopedSearchField({
  variant,
  initialType = "artist",
  initialQuery = "",
  resetAfterNavigate = false,
  fluid = false,
  onSubmitSearch,
}: ScopedSearchFieldProps) {
  const t = useTranslations("catalog.search");
  const tArtist = useTranslations("catalog.artist");
  const router = useRouter();
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-suggestions`;
  const typeListId = `${baseId}-types`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeButtonRef = useRef<HTMLButtonElement>(null);
  const typeListRef = useRef<HTMLUListElement>(null);

  const [type, setType] = useState<SearchType>(initialType);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [typeActive, setTypeActive] = useState(0);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isNavigating, startTransition] = useTransition();

  const trimmed = query.trim();
  const suggestKey = `${type}|${trimmed}`;

  // Sugerencias locales con debounce. Un fallo es silencioso: el desplegable
  // queda solo con las acciones y el envío sigue funcionando.
  useEffect(() => {
    if (!open || trimmed.length < MIN_SUGGEST_LENGTH) {
      setSuggestions([]);
      setLoadedFor(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      getSearchSuggestions(type, trimmed, controller.signal)
        .then((response) => {
          setSuggestions(response.suggestions);
          setLoadedFor(suggestKey);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setSuggestions([]);
          setLoadedFor(suggestKey);
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, type, trimmed, suggestKey]);

  // Selector de tipo: se cierra al hacer clic fuera.
  useEffect(() => {
    if (!typeMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setTypeMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [typeMenuOpen]);

  useEffect(() => {
    if (typeMenuOpen) typeListRef.current?.focus();
  }, [typeMenuOpen]);

  const visibleSuggestions = loadedFor === suggestKey ? suggestions : [];
  const options: Option[] = trimmed
    ? [
        ...visibleSuggestions.map(
          (suggestion): Option => ({ kind: "suggestion", suggestion, href: suggestionHref(suggestion) }),
        ),
        { kind: "seeAll", href: searchHref(type, trimmed) },
      ]
    : [];
  const showDropdown = open && trimmed.length > 0;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const reset = () => {
    setOpen(false);
    setActiveIndex(-1);
    if (resetAfterNavigate) {
      setQuery("");
      setType("artist");
    }
  };

  const navigate = (href: string) => {
    reset();
    startTransition(() => router.push(href));
  };

  const changeType = (next: SearchType) => {
    setType(next);
    setActiveIndex(-1);
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const active = activeIndex >= 0 ? options[activeIndex] : undefined;
    if (active) {
      if (active.kind === "seeAll") onSubmitSearch?.(trimmed, type);
      navigate(active.href);
      return;
    }
    if (!trimmed) {
      if (variant === "full") setValidationError(t("validationEmpty"));
      return;
    }
    setValidationError(undefined);
    onSubmitSearch?.(trimmed, type);
    navigate(searchHref(type, trimmed));
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        const next = current + step;
        if (next < -1) return options.length - 1;
        if (next >= options.length) return -1;
        return next;
      });
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  // El desplegable se cierra cuando el foco sale del buscador completo (no
  // al pasar del campo a los accesos "Buscar en otro tipo").
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const onTypeListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setTypeActive((current) => (current + step + SEARCH_TYPES.length) % SEARCH_TYPES.length);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setTypeActive(event.key === "Home" ? 0 : SEARCH_TYPES.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setTypeMenuOpen(false);
      changeType(SEARCH_TYPES[typeActive]!);
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setTypeMenuOpen(false);
      if (event.key === "Escape") typeButtonRef.current?.focus();
    }
  };

  const openTypeMenu = () => {
    setTypeActive(SEARCH_TYPES.indexOf(type));
    setOpen(false);
    setTypeMenuOpen((current) => !current);
  };

  const compact = variant === "compact";
  const typeLabel = t(`types.${type}`);
  const countText =
    showDropdown && loadedFor === suggestKey ? t("suggestions.count", { count: visibleSuggestions.length }) : "";

  const field = (
    <div
      className={`flex items-stretch rounded border bg-ink-surface transition-colors focus-within:border-amber/70 ${
        validationError ? "border-danger" : "border-ink-border"
      } ${compact ? "h-8" : "h-11"}`}
    >
      <button
        ref={typeButtonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={typeMenuOpen}
        aria-controls={typeListId}
        aria-label={t("typeSelector.label", { type: typeLabel })}
        onClick={openTypeMenu}
        className={`flex shrink-0 items-center gap-1.5 border-r border-ink-border text-paper-muted transition-colors hover:text-paper ${
          compact ? "px-2" : "px-3"
        }`}
      >
        <SearchTypeIcon type={type} className={compact ? "size-3.5" : "size-4"} />
        <span className={`font-data text-xs text-paper ${compact ? "sr-only" : "hidden sm:inline"}`}>
          {typeLabel}
        </span>
        <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <input
        ref={inputRef}
        id={inputId}
        type="search"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? `${inputId}-error` : undefined}
        value={query}
        disabled={isNavigating && !compact}
        placeholder={t(`placeholder.${type}`)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (validationError) setValidationError(undefined);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
        className={`min-w-0 flex-1 bg-transparent text-paper placeholder:text-paper-muted focus:outline-none ${
          compact
            ? `px-2 font-data text-xs ${fluid ? "w-full" : "w-40 transition-[width] focus:w-56"}`
            : "px-3 font-body text-base"
        }`}
      />

      {compact ? (
        <button
          type="submit"
          aria-label={t("submit")}
          className="flex shrink-0 items-center px-2 text-paper-muted transition-colors hover:text-paper"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      ) : null}
    </div>
  );

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className={`relative flex flex-col gap-1.5 ${fluid || !compact ? "w-full" : ""}`}
    >
      <label htmlFor={inputId} className={compact ? "sr-only" : "font-display text-sm text-paper-muted"}>
        {t("fieldLabel")}
      </label>

      <div ref={containerRef} onBlur={onBlur} className="relative">
        <div className={compact ? "" : "flex flex-col gap-3 sm:flex-row"}>
          <div className="min-w-0 flex-1">{field}</div>
          {compact ? null : (
            <button
              type="submit"
              disabled={isNavigating}
              className="h-11 shrink-0 rounded bg-amber px-5 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-60"
            >
              {isNavigating ? t("submitting") : t("submit")}
            </button>
          )}
        </div>

        {typeMenuOpen ? (
          <ul
            ref={typeListRef}
            id={typeListId}
            role="listbox"
            tabIndex={-1}
            aria-label={t("typeSelector.listLabel")}
            aria-activedescendant={`${typeListId}-${SEARCH_TYPES[typeActive]}`}
            onKeyDown={onTypeListKeyDown}
            className="absolute left-0 top-full z-50 mt-1.5 flex w-48 flex-col rounded-lg border border-ink-border bg-ink-surface p-1 shadow-lg shadow-black/40 focus:outline-none"
          >
            {SEARCH_TYPES.map((option, index) => (
              <li
                key={option}
                id={`${typeListId}-${option}`}
                role="option"
                aria-selected={option === type}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  setTypeMenuOpen(false);
                  changeType(option);
                }}
                onPointerEnter={() => setTypeActive(index)}
                className={`flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 font-data text-xs transition-colors ${
                  index === typeActive ? "bg-ink text-paper" : "text-paper-muted"
                }`}
              >
                <SearchTypeIcon type={option} className="size-4" />
                <span className="flex-1">{t(`types.${option}`)}</span>
                {option === type ? <span className="size-1.5 rounded-full bg-amber" aria-hidden /> : null}
              </li>
            ))}
          </ul>
        ) : null}

        {showDropdown ? (
          <div
            className={`absolute left-0 top-full z-50 mt-1.5 overflow-hidden rounded-lg border border-ink-border bg-ink-surface shadow-lg shadow-black/40 ${
              compact && !fluid ? "w-[min(24rem,calc(100vw-2rem))]" : "w-full"
            }`}
          >
            <ul id={listboxId} role="listbox" aria-label={t("suggestions.listLabel")} className="flex flex-col py-1">
              {visibleSuggestions.length > 0 ? (
                <li role="presentation" className="px-3 pb-1 pt-1.5 font-data text-[11px] uppercase tracking-[0.14em] text-paper-muted">
                  {t("suggestions.fromCatalog")}
                </li>
              ) : null}
              {options.map((option, index) => (
                <li
                  key={option.kind === "seeAll" ? "see-all" : `${option.suggestion.kind}-${option.suggestion.id}`}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => navigate(option.href)}
                  onPointerEnter={() => setActiveIndex(index)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                    option.kind === "seeAll" ? "border-t border-ink-border" : ""
                  } ${index === activeIndex ? "bg-ink" : ""}`}
                >
                  {option.kind === "seeAll" ? (
                    <>
                      <span className="flex size-8 shrink-0 items-center justify-center text-amber">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                      <span className="min-w-0 flex-1 truncate font-body text-sm text-paper">
                        {t("suggestions.seeAll", { query: trimmed, type: typeLabel.toLowerCase() })}
                      </span>
                      <kbd aria-hidden className="hidden shrink-0 font-data text-[11px] text-paper-muted sm:inline">Enter</kbd>
                    </>
                  ) : (
                    <SuggestionRow
                      suggestion={option.suggestion}
                      scope={type}
                      kindLabel={t(`kinds.${option.suggestion.kind}`)}
                      artistTypeLabel={(artistType) => tArtist(`typeLabels.${artistType}`)}
                    />
                  )}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-border px-3 py-2.5">
              <span className="mr-1 font-data text-[11px] text-paper-muted">{t("suggestions.otherTypes")}</span>
              {SEARCH_TYPES.filter((option) => option !== type).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeType(option)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-border px-2.5 py-1 font-data text-[11px] text-paper-muted transition-colors hover:border-amber/60 hover:text-paper"
                >
                  <SearchTypeIcon type={option} className="size-3" />
                  {t(`types.${option}`)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <span className="sr-only" aria-live="polite">
        {countText}
      </span>

      {validationError ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {validationError}
        </p>
      ) : null}
    </form>
  );
}

function SuggestionRow({
  suggestion,
  scope,
  kindLabel,
  artistTypeLabel,
}: {
  suggestion: SearchSuggestion;
  scope: SearchType;
  kindLabel: string;
  artistTypeLabel: (artistType: "person" | "group" | "various") => string;
}) {
  let title: string;
  let meta: (string | null)[];
  let thumb: React.ReactNode;

  switch (suggestion.kind) {
    case "artist":
      title = suggestion.name;
      meta = [
        suggestion.artistType === "unknown" ? null : artistTypeLabel(suggestion.artistType),
        suggestion.disambiguation,
      ];
      thumb = (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-paper-muted">
          <SearchTypeIcon type="artist" className="size-3.5" />
        </span>
      );
      break;
    case "album":
      title = suggestion.title;
      // En otro tipo (puente artista + título), la fila se marca con su tipo.
      meta = [scope === "album" ? null : kindLabel, suggestion.artistName, suggestion.year ? String(suggestion.year) : null];
      thumb = (
        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-ink text-paper-muted">
          <SearchTypeIcon type="album" className="size-3.5" />
        </span>
      );
      break;
    case "song":
      title = suggestion.title;
      meta = [suggestion.artistName];
      thumb = (
        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-ink text-paper-muted">
          <SearchTypeIcon type="song" className="size-3.5" />
        </span>
      );
      break;
    case "user":
      title = suggestion.displayName ?? suggestion.username;
      meta = [`@${suggestion.username}`];
      thumb = (
        <span className="flex size-8 shrink-0 items-center justify-center">
          <UserAvatar avatarUrl={suggestion.avatarUrl} username={suggestion.username} name={title} size="xs" className="size-7" />
        </span>
      );
      break;
  }

  const metaText = meta.filter(Boolean).join(" · ");
  return (
    <>
      {thumb}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-sm text-paper">{title}</span>
        {metaText ? <span className="truncate font-data text-[11px] text-paper-muted">{metaText}</span> : null}
      </span>
    </>
  );
}
