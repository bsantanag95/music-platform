"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LazyCoverImage } from "@/components/catalog/LazyCoverImage";
import { createListenEntry } from "@/lib/api/diary";
import { useCatalogSearch } from "./useCatalogSearch";

// Puerta 2 del onboarding: registrar una escucha en el diario. Solo eso —
// sin pedir reacción ni impresión (openspec: add-two-door-onboarding, OQ1);
// se agregan después desde el diario. Acepta álbum (`release-group`) y
// canción (vía `songContext`).
export function NowPlayingPicker() {
  const t = useTranslations("onboarding");
  const { query, setQuery, response, loading } = useCatalogSearch();
  const [logged, setLogged] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  const albums = (response?.results ?? []).filter((r) => r.kind === "release-group");
  const song = response?.songContext ?? null;

  async function log(target: { type: "release-group" | "recording"; id: string }, title: string) {
    setBusyId(target.id);
    setErrored(false);
    try {
      await createListenEntry(target);
      setLogged((prev) => [title, ...prev]);
    } catch {
      setErrored(true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-ink-border bg-ink-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-paper">{t("door2.heading")}</h2>
        <p className="font-body text-sm text-paper-muted">{t("door2.intro")}</p>
      </div>

      {logged.length > 0 && (
        <ul className="flex flex-col gap-1">
          {logged.map((title, i) => (
            <li key={`${title}-${i}`} role="status" className="font-data text-xs text-petrol-hover">
              {t("door2.logged", { title })}
            </li>
          ))}
        </ul>
      )}

      <label className="flex flex-col gap-1 font-data text-xs text-paper">
        {t("door2.searchLabel")}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("door2.searchPlaceholder")}
          className="rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper placeholder:text-paper-muted"
        />
      </label>

      {loading && <p className="font-data text-xs text-paper-muted">{t("door2.searching")}</p>}
      {errored && <p role="alert" className="font-data text-xs text-danger">{t("error")}</p>}
      {!loading && query.trim().length >= 2 && albums.length === 0 && !song && (
        <p className="font-data text-xs text-paper-muted">{t("door2.noResults")}</p>
      )}

      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {song && (
          <li>
            <button
              type="button"
              disabled={busyId === song.recordingId}
              onClick={() => log({ type: "recording", id: song.recordingId }, song.title)}
              className="flex w-full items-center gap-2 rounded border border-ink-border bg-ink px-2 py-1.5 text-left transition-colors hover:border-amber disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block truncate font-body text-xs text-paper">{song.title}</span>
                {song.artistName && (
                  <span className="block truncate font-data text-[11px] text-paper-muted">
                    {song.artistName}
                  </span>
                )}
              </span>
            </button>
          </li>
        )}
        {albums.map((album) => (
          <li key={album.id}>
            <button
              type="button"
              disabled={busyId === album.id}
              onClick={() => log({ type: "release-group", id: album.id }, album.name)}
              className="flex w-full items-center gap-2 rounded border border-ink-border bg-ink px-2 py-1.5 text-left transition-colors hover:border-amber disabled:opacity-50"
            >
              <LazyCoverImage releaseGroupId={album.id} coverLabel="" className="size-8" />
              <span className="min-w-0">
                <span className="block truncate font-body text-xs text-paper">{album.name}</span>
                {album.subtitle && (
                  <span className="block truncate font-data text-[11px] text-paper-muted">
                    {album.subtitle}
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
