"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useTargetSearch, type TargetCandidate } from "@/components/quick-actions/use-target-search";
import { followArtist, unfollowArtist } from "@/lib/api/catalog";
import { isArrayOf, isRecord, useSessionState } from "@/lib/session-state";
import { SearchStatus } from "./SearchStatus";

interface FollowedArtist {
  id: string;
  name: string;
  subtitle: string | null;
}

function isFollowedArtist(value: unknown): value is FollowedArtist {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.subtitle === null || typeof value.subtitle === "string")
  );
}

const isFollowedList = isArrayOf(isFollowedArtist);

interface ArtistFollowPickerProps {
  /** Cuántos artistas sigue el usuario desde este paso (para el resumen y el botón de salida). */
  onCountChange?: (count: number) => void;
  /** Clave de `sessionStorage` para conservar lo seguido al recargar; sin ella solo vive en memoria. */
  storageKey?: string;
}

// Paso 2 del onboarding: seguir artistas. Al elegir uno se sigue de inmediato
// (`PUT /api/artists/{id}/follow`, idempotente y sin tope); lo seguido sale de
// los resultados y se lista aparte con «Dejar de seguir». Mismo patrón que la
// Puerta 2: un clic repetido no repite la solicitud y un clic errado se corrige.
// Seguir artistas alimenta «De tus artistas» en los lanzamientos de Inicio.
export function ArtistFollowPicker({ onCountChange, storageKey }: ArtistFollowPickerProps) {
  const t = useTranslations("onboarding");
  const [query, setQuery] = useState("");
  const search = useTargetSearch("artist", query);
  const [followed, setFollowed] = useSessionState<FollowedArtist[]>(storageKey ?? null, [], isFollowedList);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [errored, setErrored] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const inFlight = useRef(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onCountChange?.(followed.length);
  }, [followed.length, onCountChange]);

  const followedIds = new Set(followed.map((a) => a.id));
  const results = search.candidates.filter((c) => !followedIds.has(c.id));

  function setBusy(id: string, busy: boolean) {
    if (busy) inFlight.current.add(id);
    else inFlight.current.delete(id);
    setBusyIds([...inFlight.current]);
  }

  async function follow(candidate: TargetCandidate) {
    if (inFlight.current.has(candidate.id) || followedIds.has(candidate.id)) return;
    setBusy(candidate.id, true);
    setErrored(false);
    try {
      await followArtist(candidate.id);
      setFollowed((prev) => [{ id: candidate.id, name: candidate.title, subtitle: candidate.subtitle }, ...prev]);
      setAnnouncement(t("artists.followed", { name: candidate.title }));
      // El resultado elegido sale de la lista: se limpia el texto y el foco vuelve al campo.
      setQuery("");
      inputRef.current?.focus();
    } catch {
      setErrored(true);
    } finally {
      setBusy(candidate.id, false);
    }
  }

  async function unfollow(artist: FollowedArtist) {
    if (inFlight.current.has(artist.id)) return;
    setBusy(artist.id, true);
    setErrored(false);
    try {
      await unfollowArtist(artist.id);
      setFollowed((prev) => prev.filter((a) => a.id !== artist.id));
      setAnnouncement(t("artists.unfollowed", { name: artist.name }));
    } catch {
      setErrored(true);
    } finally {
      setBusy(artist.id, false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">{t("artists.heading")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("artists.intro")}</p>
      </div>

      {followed.length > 0 && (
        <ul className="flex flex-col gap-2">
          {followed.map((artist) => (
            <li
              key={artist.id}
              className="flex items-center gap-3 rounded border border-ink-border bg-ink p-2 pl-3"
            >
              <span aria-hidden="true" className="font-data text-sm text-petrol-hover">
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm text-paper">{artist.name}</span>
                {artist.subtitle && (
                  <span className="block truncate font-data text-xs text-paper-muted">{artist.subtitle}</span>
                )}
              </span>
              <button
                type="button"
                disabled={busyIds.includes(artist.id)}
                aria-label={t("artists.unfollowLabel", { name: artist.name })}
                onClick={() => void unfollow(artist)}
                className="min-h-11 rounded px-2 font-data text-xs text-paper-muted underline hover:text-paper disabled:opacity-50"
              >
                {t("artists.unfollow")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="font-data text-xs text-paper-muted">{t("artists.count", { count: followed.length })}</p>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 font-data text-xs text-paper">
          {t("artists.searchLabel")}
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("artists.searchPlaceholder")}
            className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-base text-paper placeholder:text-paper-muted sm:text-sm"
          />
        </label>
        <SearchStatus
          searchable={search.searchable}
          pending={search.pending}
          failed={search.failed}
          resultCount={results.length}
          labels={{ searching: t("artists.searching"), noResults: t("artists.noResults"), error: t("searchError") }}
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
          {results.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                disabled={busyIds.includes(candidate.id)}
                onClick={() => void follow(candidate)}
                className="flex min-h-11 w-full items-center gap-2 rounded border border-ink-border bg-ink px-2 py-1.5 text-left transition-colors hover:border-amber disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-body text-sm text-paper">{candidate.title}</span>
                  {candidate.subtitle && (
                    <span className="block truncate font-data text-xs text-paper-muted">{candidate.subtitle}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="font-data text-xs text-paper-muted">{t("artists.note")}</p>
    </section>
  );
}
