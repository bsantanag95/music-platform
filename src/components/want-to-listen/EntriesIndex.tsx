"use client";

import { Link } from "@/i18n/navigation";
import { RemoveEntryButton } from "./RemoveEntryButton";
import { wantToListenHref } from "./want-to-listen-shared";
import type { WantToListenRendererProps } from "./want-to-listen-items-view";

// Modo Índice: filas de texto compactas para escanear una lista larga. El
// resaltado de fondo al posar el puntero señala que la fila es interactiva; el
// control de quitar queda tenue en reposo (nunca invisible) y llega a opacidad
// plena al posar el puntero o enfocar — siempre visible en pantallas angostas,
// donde no hay hover — mismo criterio que `ItemsIndex`.
export function EntriesIndex({ entries, actions }: WantToListenRendererProps) {
  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="group flex items-center gap-3 rounded-md border-b border-ink-border px-2 py-2 transition-colors last:border-b-0 hover:bg-ink-surface"
        >
          <Link
            href={wantToListenHref(entry)}
            className="min-w-0 flex-1 truncate font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {entry.target.title}
          </Link>
          <div className="flex shrink-0 items-center opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-40 sm:group-hover:opacity-100">
            <RemoveEntryButton
              title={entry.target.title}
              busy={actions.busy}
              onRemove={() => actions.remove(entry.id)}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
