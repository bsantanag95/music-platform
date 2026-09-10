"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { searchCatalog } from "@/lib/api/catalog";
import { createListenEntry } from "@/lib/api/diary";
import { ApiError } from "@/lib/api/client";
import type { CatalogSearchResponse, ListenEntry, SocialTargetType } from "@/lib/api/schemas";
import { ListenEntryForm } from "./ListenEntryForm";

interface RegisterListenDialogProps {
  onClose: () => void;
}

interface PickTarget {
  type: SocialTargetType;
  id: string;
  title: string;
  subtitle: string | null;
}

const DEBOUNCE_MS = 300;

// Modal del acceso global "+ Registrar" (cambio add-global-listen-logging):
// buscar en el catálogo → elegir objetivo → crear la escucha → ampliarla.
// Es el flujo de `MarkAsListened` con un paso previo de elegir objetivo. A11y
// al nivel de `GetStartedModal`: portal, focus-trap, Escape, retorno de foco.
export function RegisterListenDialog({ onClose }: RegisterListenDialogProps) {
  const t = useTranslations("diary");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [entry, setEntry] = useState<ListenEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [results, setResults] = useState<CatalogSearchResponse | null>(null);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const id = setTimeout(() => setQuery(rawQuery.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [rawQuery]);

  // Focus-trap + Escape + bloqueo de scroll, mismo patrón que GetStartedModal.
  // Espera a `mounted` para que el portal (y el input) ya estén en el DOM.
  useEffect(() => {
    if (!mounted) return;
    searchInputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, mounted]);

  // Búsqueda manual (sin react-query): el Header vive fuera de `<Providers>`,
  // así que no hay `QueryClientProvider` en este árbol. Mismo criterio que
  // `AddToListButton` / `HeaderSearch`.
  useEffect(() => {
    if (query.length < 2 || entry !== null) {
      setResults(null);
      setSearchState("idle");
      return;
    }
    let cancelled = false;
    setSearchState("loading");
    searchCatalog(query)
      .then((res) => {
        if (!cancelled) {
          setResults(res);
          setSearchState("idle");
        }
      })
      .catch(() => {
        if (!cancelled) setSearchState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [query, entry]);

  const candidates = useMemo<PickTarget[]>(() => {
    if (!results) return [];
    const songs: PickTarget[] = results.songContext
      ? [
          {
            type: "recording",
            id: results.songContext.recordingId,
            title: results.songContext.title,
            subtitle: results.songContext.artistName,
          },
        ]
      : [];
    const albums = results.results
      .filter((r) => r.kind === "release-group")
      .map((r): PickTarget => ({ type: "release-group", id: r.id, title: r.name, subtitle: r.subtitle }));
    const artists = results.results
      .filter((r) => r.kind === "artist")
      .map((r): PickTarget => ({ type: "artist", id: r.id, title: r.name, subtitle: r.subtitle }));
    return [...songs, ...albums, ...artists];
  }, [results]);

  const pick = useCallback(
    async (target: PickTarget) => {
      setCreating(true);
      setErrorCode(null);
      try {
        setEntry(await createListenEntry({ type: target.type, id: target.id }));
      } catch (err) {
        setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
      } finally {
        setCreating(false);
      }
    },
    [],
  );

  const registerAnother = () => {
    setEntry(null);
    setErrorCode(null);
    setRawQuery("");
    setQuery("");
    searchInputRef.current?.focus();
  };

  const typeLabel = (type: SocialTargetType) =>
    type === "artist"
      ? t("global.typeArtist")
      : type === "release-group"
        ? t("global.typeAlbum")
        : t("global.typeSong");

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/70 p-4 pt-16"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-lg text-paper">
            {t("global.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("global.close")}
            className="shrink-0 font-data text-sm text-paper-muted transition-colors hover:text-paper"
          >
            ✕
          </button>
        </div>

        {entry ? (
          <div className="flex flex-col gap-4">
            <p role="status" className="font-data text-sm text-paper">
              {t("global.created", { title: entry.target.title })}
            </p>
            <ListenEntryForm
              entryId={entry.id}
              initial={{
                listenContext: entry.listenContext,
                body: entry.body,
                reaction: entry.reaction,
                audience: entry.audience,
              }}
              onSaved={setEntry}
            />
            <div className="flex flex-wrap items-center gap-3 border-t border-ink-border pt-4">
              <Button variant="secondary" onClick={registerAnother}>
                {t("global.registerAnother")}
              </Button>
              <Link
                href="/me/diary"
                onClick={onClose}
                className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
              >
                {t("global.viewDiary")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label htmlFor={`${titleId}-q`} className="font-data text-sm text-paper">
              {t("global.pickPrompt")}
            </label>
            <input
              id={`${titleId}-q`}
              ref={searchInputRef}
              type="search"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              placeholder={t("global.searchPlaceholder")}
              className="rounded border border-ink-border bg-ink px-3 py-2 font-data text-sm text-paper placeholder:text-paper-muted"
            />

            {errorCode === "AUTH_REQUIRED" ? (
              <Link href="/auth/login" className="font-data text-sm text-amber underline">
                {t("signInToListen")}
              </Link>
            ) : errorCode ? (
              <span role="alert" className="font-data text-xs text-danger">
                {t("saveError")}
              </span>
            ) : null}

            {creating ? (
              <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
                <Spinner label={t("listening")} className="size-4" /> {t("listening")}
              </span>
            ) : query.length < 2 ? (
              <p className="font-data text-xs text-paper-muted">{t("global.hint")}</p>
            ) : searchState === "loading" ? (
              <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
                <Spinner label={t("global.searching")} className="size-4" /> {t("global.searching")}
              </span>
            ) : searchState === "error" ? (
              <span role="alert" className="font-data text-xs text-danger">
                {t("global.searchError")}
              </span>
            ) : candidates.length === 0 ? (
              <p className="font-data text-xs text-paper-muted">
                {t("global.noResults", { query })}
              </p>
            ) : (
              <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {candidates.map((c) => (
                  <li key={`${c.type}:${c.id}`}>
                    <button
                      type="button"
                      disabled={creating}
                      onClick={() => void pick(c)}
                      className="flex w-full items-center gap-3 rounded border border-transparent px-2 py-2 text-left transition-colors hover:border-ink-border hover:bg-ink disabled:opacity-50"
                    >
                      <CoverThumb cover={null} label="" className="size-10" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-display text-sm text-paper">{c.title}</span>
                        <span className="truncate font-data text-xs text-paper-muted">
                          {typeLabel(c.type)}
                          {c.subtitle ? ` · ${c.subtitle}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
