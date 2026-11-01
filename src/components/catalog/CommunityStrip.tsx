import type { ReactNode } from "react";

// Franja de comunidad compartida por las cabeceras de álbum y canción (openspec: refine-song-page-phase2, D1; nacida en
// refine-album-page-phase2): una fila dividida en celdas, la cifra arriba y la etiqueta debajo, como la del artista
// (`ArtistCommunity`). Quien la usa decide qué celdas tienen dato: una celda vacía no se dibuja.

export interface CommunityCell {
  key: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}

const COLUMNS = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" } as const;

function Stat({ label, value, detail }: Omit<CommunityCell, "key">) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5 sm:px-4">
      {/* La cifra va primero a la vista; en el DOM el `dt` sigue antes del `dd`, como pide `<dl>`. */}
      <dt className="order-2 font-data text-xs text-paper-muted">{label}</dt>
      <dd className="order-1 font-display text-xl leading-tight text-paper tabular-nums">{value}</dd>
      {detail ? <dd className="order-3 font-data text-xs text-paper-muted">{detail}</dd> : null}
    </div>
  );
}

export function CommunityStrip({ cells }: { cells: CommunityCell[] }) {
  const columns = COLUMNS[Math.min(Math.max(cells.length, 1), 4) as 1 | 2 | 3 | 4];
  return (
    <dl className={`grid ${columns} divide-x divide-ink-border rounded border border-ink-border bg-ink-surface`}>
      {cells.map(({ key, ...cell }) => (
        <Stat key={key} {...cell} />
      ))}
    </dl>
  );
}
