"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EntryActions } from "./EntryActions";
import { EntryExtras } from "./EntryExtras";
import { EntryMedia, NotedAgo, useEntryFacts } from "./entry-parts";
import { wantToListenArtistHref, wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Detallada (openspec: redesign-want-to-listen-views, D5): filas separadas por una línea, sin tarjetas. Carátula
// o foto, título, "artista · año · tipo" y cuánto hace que se anotó; a la derecha "Ya lo escuché" (desde `sm`; en
// pantallas angostas está en el menú, para no quitarle ancho al título) y el `⋯`.
export function EntriesDetailed({ entries, actions, priorityIds }: WantToListenRendererProps) {
  const t = useTranslations("wantToListen");
  const facts = useEntryFacts();
  return (
    <ul className="flex flex-col divide-y divide-ink-border">
      {entries.map((entry) => {
        const href = wantToListenHref(entry);
        const artistHref = wantToListenArtistHref(entry);
        const journeyAdded = entry.targetType === "artist" && actions.journeyStatus(entry.target.id) === "added";
        return (
          <li key={entry.id} className="flex flex-col gap-2 py-3">
            <div className="flex items-center gap-3">
              <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
                <EntryMedia entry={entry} className="size-14" priority={priorityIds.has(entry.id)} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link
                  href={href}
                  className="truncate font-display text-base text-paper transition-colors hover:text-amber"
                >
                  {entry.target.title}
                </Link>
                <p className="truncate font-data text-xs text-paper-muted">
                  {artistHref && entry.target.artistName ? (
                    <>
                      <Link href={artistHref} className="transition-colors hover:text-amber">
                        {entry.target.artistName}
                      </Link>
                      {facts(entry, { withArtist: false }) ? ` · ${facts(entry, { withArtist: false })}` : null}
                    </>
                  ) : (
                    facts(entry)
                  )}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-data text-[0.7rem] text-paper-muted/80">
                  <NotedAgo iso={entry.createdAt} prefix />
                  {journeyAdded ? (
                    <span className="rounded-full border border-petrol/50 px-2 py-px text-petrol-hover">
                      {t("journeyInProgress")}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  disabled={actions.busy}
                  onClick={() => actions.listened(entry.id)}
                  aria-label={t("listenedNamed", { title: entry.target.title })}
                  className="hidden rounded border border-ink-border px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber disabled:opacity-50 sm:inline-flex"
                >
                  {t("listened")}
                </button>
                <EntryActions entry={entry} actions={actions} />
              </div>
            </div>
            <EntryExtras entry={entry} actions={actions} />
          </li>
        );
      })}
    </ul>
  );
}
