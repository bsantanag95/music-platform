"use client";

import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "./ArtistPlate";
import { RemoveEntryButton } from "./RemoveEntryButton";
import { wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Detallada: una fila-tarjeta por entrada con carátula/placa y título.
// Es el modo por defecto — mismo tratamiento visual que `ItemsDetailed`.
export function EntriesDetailed({ entries, actions }: WantToListenRendererProps) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const href = wantToListenHref(entry);
        const media =
          entry.targetType === "release-group" ? (
            <CoverThumb cover={entry.target.coverThumbUrl} label="" className="size-14 sm:size-16" />
          ) : (
            <ArtistPlate title={entry.target.title} className="size-14 sm:size-16" textClassName="text-xl sm:text-2xl" />
          );

        return (
          <li
            key={entry.id}
            className="flex gap-3 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors focus-within:border-amber"
          >
            <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
              {media}
            </Link>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <Link
                href={href}
                className="truncate font-display text-base text-paper transition-colors hover:text-amber"
              >
                {entry.target.title}
              </Link>
              <RemoveEntryButton
                title={entry.target.title}
                busy={actions.busy}
                onRemove={() => actions.remove(entry.id)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
