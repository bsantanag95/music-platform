"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { dismissConcertSuggestion, linkConcertEntry } from "@/lib/api/concerts";
import { concertHref } from "@/lib/catalog-links";
import type { ConcertLinkSuggestion } from "@/services/concerts/suggestions";
import { formatConcertDate, formatConcertPlace } from "./concert-format";
import { sharedConcertPlace } from "./shared-concert-format";

// "¿Son estos tus conciertos?" en Mis conciertos (openspec: add-shared-concerts-phase3, capability `concert-log`): para
// cada recuerdo sin enlazar, los conciertos compartidos que probablemente son ese recuerdo. "Enlazar" no toca lo escrito;
// "No es este" lo descarta para siempre. La sugerencia desaparece al instante y la ruta se refresca.

interface ConcertLinkSuggestionsProps {
  suggestions: ConcertLinkSuggestion[];
  total: number;
}

const key = (suggestion: ConcertLinkSuggestion) => `${suggestion.entry.id}:${suggestion.concert.id}`;

export function ConcertLinkSuggestions({ suggestions, total }: ConcertLinkSuggestionsProps) {
  const t = useTranslations("concerts.links");
  const locale = useLocale();
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const visible = suggestions.filter((suggestion) => !done.has(key(suggestion)));
  if (visible.length === 0) return null;

  async function act(suggestion: ConcertLinkSuggestion, action: "link" | "dismiss") {
    const id = key(suggestion);
    setBusy(id);
    setFailed(null);
    try {
      if (action === "link") await linkConcertEntry(suggestion.entry.id, suggestion.concert.id);
      else await dismissConcertSuggestion(suggestion.entry.id, suggestion.concert.id);
      // Al enlazar, las demás sugerencias de ese recuerdo dejan de tener sentido.
      setDone((current) => {
        const next = new Set(current);
        for (const other of suggestions) {
          if (other.entry.id === suggestion.entry.id && (action === "link" || other.concert.id === suggestion.concert.id)) {
            next.add(key(other));
          }
        }
        return next;
      });
      router.refresh();
    } catch {
      setFailed(id);
    } finally {
      setBusy(null);
    }
  }

  const more = total - suggestions.length;
  return (
    <section aria-labelledby="concert-link-suggestions" className="flex flex-col gap-3 rounded-lg border border-amber/40 bg-amber/5 p-4 sm:p-5">
      <div className="flex flex-col gap-0.5">
        <h2 id="concert-link-suggestions" className="font-display text-lg text-paper">
          {t("title")}
        </h2>
        <p className="font-body text-sm text-paper-muted">{t("intro")}</p>
      </div>
      <ul className="flex flex-col divide-y divide-ink-border">
        {visible.map((suggestion) => {
          const id = key(suggestion);
          const memoryPlace = formatConcertPlace({ city: suggestion.entry.city, country: suggestion.entry.country, venue: null }, locale);
          const concertPlace = sharedConcertPlace(suggestion.concert, locale);
          return (
            <li key={id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-data text-xs text-paper-muted">
                  {t("memory", {
                    artist: suggestion.entry.artistName,
                    date: formatConcertDate(suggestion.entry.eventDate, locale),
                  })}
                  {memoryPlace ? ` · ${memoryPlace}` : ""}
                </p>
                <Link
                  href={concertHref(suggestion.concert.name, suggestion.concert.id)}
                  className="font-display text-base text-paper hover:underline"
                >
                  {suggestion.concert.name}
                </Link>
                <p className="font-body text-sm text-paper-muted">
                  {[
                    formatConcertDate(suggestion.concert.eventDate, locale),
                    concertPlace,
                    suggestion.concert.status === "pending" ? t("pending") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {failed === id && (
                  <p role="alert" className="font-data text-xs text-danger">
                    {t("error")}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void act(suggestion, "link")}
                  className="inline-flex min-h-8 items-center rounded border border-amber/60 px-2.5 font-data text-xs uppercase tracking-wide text-amber transition-colors hover:bg-amber/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("link")}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void act(suggestion, "dismiss")}
                  className="py-1.5 font-data text-xs text-paper-muted underline-offset-2 hover:text-paper hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("dismiss")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {more > 0 && <p className="font-data text-xs text-paper-muted">{t("more", { count: more })}</p>}
    </section>
  );
}
