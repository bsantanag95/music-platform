"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { SearchTypeToggle } from "@/components/catalog/SearchTypeToggle";
import { useTargetSearch, type TargetCandidate } from "@/components/quick-actions/use-target-search";
import { createListenEntry, deleteListenEntry } from "@/lib/api/diary";
import { categoryKey } from "./ResultCategory";
import { SearchStatus } from "./SearchStatus";

// Puerta 2 del onboarding: registrar una escucha en el diario. Solo eso —
// sin pedir reacción ni impresión (openspec: add-two-door-onboarding, OQ1);
// se agregan después desde el diario. Acepta álbum (`release-group`) y
// canción: un tipo por búsqueda, elegido con el conmutador (openspec:
// redesign-scoped-search). Busca con el mismo motor que el diálogo "Añadir";
// en Canciones (`purpose: "pick"`) trae todas las canciones registrables, no
// solo la primera. Lo registrado sale de los resultados y se lista aparte con
// "Deshacer": un clic repetido no duplica la entrada y un clic errado se corrige.
const DOOR2_TYPES = ["album", "song"] as const;

interface LoggedEntry {
  key: string;
  entryId: string;
  title: string;
  subtitle: string | null;
}

function candidateKey(candidate: TargetCandidate) {
  return `${candidate.type}:${candidate.id}`;
}

export function NowPlayingPicker() {
  const t = useTranslations("onboarding");
  const [type, setType] = useState<(typeof DOOR2_TYPES)[number]>("album");
  const [query, setQuery] = useState("");
  const search = useTargetSearch(type, query);
  const [logged, setLogged] = useState<LoggedEntry[]>([]);
  const [busyKeys, setBusyKeys] = useState<string[]>([]);
  const [errored, setErrored] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  // Fuera del estado: dos clics seguidos llegan antes de que React vuelva a pintar el botón.
  const inFlight = useRef(new Set<string>());

  const loggedKeys = new Set(logged.map((entry) => entry.key));
  const results = search.candidates.filter((c) => !loggedKeys.has(candidateKey(c)));

  function setBusy(key: string, busy: boolean) {
    if (busy) inFlight.current.add(key);
    else inFlight.current.delete(key);
    setBusyKeys([...inFlight.current]);
  }

  async function log(candidate: TargetCandidate) {
    if (candidate.type === "artist") return;
    const key = candidateKey(candidate);
    if (inFlight.current.has(key) || loggedKeys.has(key)) return;
    setBusy(key, true);
    setErrored(false);
    try {
      const entry = await createListenEntry({ type: candidate.type, id: candidate.id });
      setLogged((prev) => [
        { key, entryId: entry.id, title: candidate.title, subtitle: candidate.subtitle },
        ...prev,
      ]);
      setAnnouncement(t("door2.logged", { title: candidate.title }));
    } catch {
      setErrored(true);
    } finally {
      setBusy(key, false);
    }
  }

  async function undo(entry: LoggedEntry) {
    if (inFlight.current.has(entry.key)) return;
    setBusy(entry.key, true);
    setErrored(false);
    try {
      await deleteListenEntry(entry.entryId);
      setLogged((prev) => prev.filter((e) => e.key !== entry.key));
      setAnnouncement(t("door2.undone", { title: entry.title }));
    } catch {
      setErrored(true);
    } finally {
      setBusy(entry.key, false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">{t("door2.heading")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("door2.intro")}</p>
      </div>

      {logged.length > 0 && (
        <ul className="flex flex-col gap-2">
          {logged.map((entry) => (
            <li
              key={entry.key}
              className="flex items-center gap-3 rounded border border-ink-border bg-ink p-2 pl-3"
            >
              <span aria-hidden="true" className="font-data text-sm text-petrol-hover">
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm text-paper">{entry.title}</span>
                {entry.subtitle && (
                  <span className="block truncate font-data text-xs text-paper-muted">{entry.subtitle}</span>
                )}
              </span>
              <button
                type="button"
                disabled={busyKeys.includes(entry.key)}
                aria-label={t("door2.undoLabel", { title: entry.title })}
                onClick={() => void undo(entry)}
                className="min-h-11 rounded px-2 font-data text-xs text-paper-muted underline hover:text-paper disabled:opacity-50"
              >
                {t("door2.undo")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <SearchTypeToggle
        types={DOOR2_TYPES}
        value={type}
        onChange={setType}
        label={t("door2.typeLabel")}
        size="touch"
      />

      <label className="flex flex-col gap-1 font-data text-xs text-paper">
        {t("door2.searchLabel")}
        <input
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={type === "song" ? t("door2.searchPlaceholderSong") : t("door2.searchPlaceholderAlbum")}
          className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-base text-paper placeholder:text-paper-muted sm:text-sm"
        />
      </label>

      <SearchStatus
        searchable={search.searchable}
        pending={search.pending}
        failed={search.failed}
        resultCount={results.length}
        labels={{ searching: t("door2.searching"), noResults: t("door2.noResults"), error: t("searchError") }}
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
          const key = candidateKey(candidate);
          const category = categoryKey(candidate.category);
          const detail = [candidate.subtitle, candidate.year, category && t(`categories.${category}`)]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={key}>
              <button
                type="button"
                disabled={busyKeys.includes(key)}
                onClick={() => void log(candidate)}
                className="flex min-h-11 w-full items-center gap-2 rounded border border-ink-border bg-ink px-2 py-1.5 text-left transition-colors hover:border-amber disabled:opacity-50"
              >
                {candidate.type === "release-group" && (
                  <span aria-hidden="true" className="contents"><LazyCoverImage releaseGroupId={candidate.id} coverLabel="" className="size-8 shrink-0" /></span>
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
    </section>
  );
}
