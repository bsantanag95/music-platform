"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { SearchTypeToggle } from "@/components/catalog/SearchTypeToggle";
import { useTargetSearch, type TargetCandidate } from "@/components/quick-actions/use-target-search";
import { removeFromWantToListen, toggleWantToListen } from "@/lib/api/want-to-listen";
import { isArrayOf, isRecord, useSessionState } from "@/lib/session-state";
import { categoryKey } from "./ResultCategory";
import { SearchStatus } from "./SearchStatus";

// Paso 4 del onboarding: guardar discos y artistas para escuchar después
// (Want to Listen, «Pendientes»; openspec: extend-welcome-steps). Una lista
// propia, sin audiencia. Mismo patrón que los demás pasos: lo guardado sale de
// los resultados y se lista aparte con «Quitar»; un clic repetido no repite la
// solicitud. `POST /api/me/want-to-listen` es un *toggle* (repetir quita), así que
// si responde `null` —el objetivo ya estaba en Pendientes y se acaba de quitar—
// se vuelve a llamar para dejarlo guardado.
const WANTED_TYPES = ["album", "artist"] as const;

type WantedKind = "release-group" | "artist";

interface WantedItem {
  key: string;
  type: WantedKind;
  id: string;
  title: string;
  subtitle: string | null;
}

function isWantedItem(value: unknown): value is WantedItem {
  return (
    isRecord(value) &&
    typeof value.key === "string" &&
    (value.type === "release-group" || value.type === "artist") &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.subtitle === null || typeof value.subtitle === "string")
  );
}

const isWantedList = isArrayOf(isWantedItem);

function itemKey(type: string, id: string) {
  return `${type}:${id}`;
}

interface WantToListenPickerProps {
  /** Cuántos elementos hay en Pendientes desde este paso (para el resumen y el botón de salida). */
  onCountChange?: (count: number) => void;
  /** Clave de `sessionStorage` para conservar lo guardado al recargar; sin ella solo vive en memoria. */
  storageKey?: string;
}

export function WantToListenPicker({ onCountChange, storageKey }: WantToListenPickerProps) {
  const t = useTranslations("onboarding");
  const [type, setType] = useState<(typeof WANTED_TYPES)[number]>("album");
  const [query, setQuery] = useState("");
  const search = useTargetSearch(type, query);
  const [saved, setSaved] = useSessionState<WantedItem[]>(storageKey ?? null, [], isWantedList);
  const [busyKeys, setBusyKeys] = useState<string[]>([]);
  const [errored, setErrored] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inFlight = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onCountChange?.(saved.length);
  }, [saved.length, onCountChange]);

  const savedKeys = new Set(saved.map((item) => item.key));
  const results = search.candidates.filter(
    (c) => (c.type === "release-group" || c.type === "artist") && !savedKeys.has(itemKey(c.type, c.id)),
  );

  function setBusy(key: string, busy: boolean) {
    if (busy) inFlight.current.add(key);
    else inFlight.current.delete(key);
    setBusyKeys([...inFlight.current]);
  }

  async function save(candidate: TargetCandidate) {
    if (candidate.type !== "release-group" && candidate.type !== "artist") return;
    const key = itemKey(candidate.type, candidate.id);
    if (inFlight.current.has(key) || savedKeys.has(key)) return;
    setBusy(key, true);
    setErrored(false);
    try {
      const target = { type: candidate.type, id: candidate.id };
      let entry = await toggleWantToListen(target);
      // Ya estaba en Pendientes y el toggle lo quitó: se vuelve a guardar.
      if (entry === null) entry = await toggleWantToListen(target);
      setSaved((prev) => [
        { key, type: candidate.type as WantedKind, id: candidate.id, title: candidate.title, subtitle: candidate.subtitle },
        ...prev,
      ]);
      setAnnouncement(t("wanted.saved", { title: candidate.title }));
      setQuery("");
      inputRef.current?.focus();
    } catch {
      setErrored(true);
    } finally {
      setBusy(key, false);
    }
  }

  async function remove(item: WantedItem) {
    if (inFlight.current.has(item.key)) return;
    setBusy(item.key, true);
    setErrored(false);
    try {
      await removeFromWantToListen({ type: item.type, id: item.id });
      setSaved((prev) => prev.filter((i) => i.key !== item.key));
      setAnnouncement(t("wanted.removed", { title: item.title }));
    } catch {
      setErrored(true);
    } finally {
      setBusy(item.key, false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">{t("wanted.heading")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("wanted.intro")}</p>
      </div>

      {saved.length > 0 && (
        <ul className="flex flex-col gap-2">
          {saved.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded border border-ink-border bg-ink p-2 pl-3"
            >
              <span aria-hidden="true" className="font-data text-sm text-petrol-hover">
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm text-paper">{item.title}</span>
                {item.subtitle && (
                  <span className="block truncate font-data text-xs text-paper-muted">{item.subtitle}</span>
                )}
              </span>
              <button
                type="button"
                disabled={busyKeys.includes(item.key)}
                aria-label={t("wanted.removeLabel", { title: item.title })}
                onClick={() => void remove(item)}
                className="min-h-11 rounded px-2 font-data text-xs text-paper-muted underline hover:text-paper disabled:opacity-50"
              >
                {t("wanted.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="font-data text-xs text-paper-muted">{t("wanted.count", { count: saved.length })}</p>

      <SearchTypeToggle
        types={WANTED_TYPES}
        value={type}
        onChange={setType}
        label={t("wanted.typeLabel")}
        size="touch"
      />

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 font-data text-xs text-paper">
          {t("wanted.searchLabel")}
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={type === "artist" ? t("wanted.searchPlaceholderArtist") : t("wanted.searchPlaceholderAlbum")}
            className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-base text-paper placeholder:text-paper-muted sm:text-sm"
          />
        </label>
        <SearchStatus
          searchable={search.searchable}
          pending={search.pending}
          failed={search.failed}
          resultCount={results.length}
          labels={{ searching: t("wanted.searching"), noResults: t("wanted.noResults"), error: t("searchError") }}
        />
        {errored && (
          <p role="alert" className="font-data text-xs text-danger">
            {t("error")}
          </p>
        )}
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
        <ul className="themed-scrollbar flex max-h-72 flex-col gap-1 overflow-y-auto">
          {results.map((candidate) => {
            const key = itemKey(candidate.type, candidate.id);
            const category = categoryKey(candidate.category);
            const detail = [candidate.subtitle, candidate.year, category && t(`categories.${category}`)]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={busyKeys.includes(key)}
                  onClick={() => void save(candidate)}
                  className="flex min-h-11 w-full items-center gap-2 rounded border border-ink-border bg-ink px-2 py-1.5 text-left transition-colors hover:border-amber disabled:opacity-50"
                >
                  {candidate.type === "release-group" && (
                    <span aria-hidden="true" className="contents">
                      <LazyCoverImage releaseGroupId={candidate.id} coverLabel="" className="size-8 shrink-0" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate font-body text-sm text-paper">{candidate.title}</span>
                    {detail && <span className="block truncate font-data text-xs text-paper-muted">{detail}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="font-data text-xs text-paper-muted">{t("wanted.note")}</p>
    </section>
  );
}
