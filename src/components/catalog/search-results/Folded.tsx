"use client";

import { useState, type ReactNode } from "react";

// Lista plegada (openspec: redesign-search-phase2): se ven las primeras `visible` filas y un botón despliega el resto
// sin navegar. Las filas llegan ya renderizadas en el servidor; este componente solo decide cuántas se ven.
export function Folded({
  items,
  visible,
  moreLabel,
  className,
}: {
  items: ReactNode[];
  visible: number;
  moreLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, visible);
  return (
    <div className="flex flex-col gap-3">
      <ul className={className}>{shown}</ul>
      {!open && items.length > visible ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 items-center gap-1.5 self-start rounded-full border border-ink-border px-4 font-data text-xs text-paper-muted transition-colors hover:border-amber/60 hover:text-paper"
        >
          {moreLabel}
          <span aria-hidden>▾</span>
        </button>
      ) : null}
    </div>
  );
}
