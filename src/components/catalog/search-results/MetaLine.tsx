import { Fragment } from "react";

// Línea de datos de una fila de resultados ("Grupo · Chile · 1982–2006"). Un segmento marcado se destaca: es un dato
// que la búsqueda avanzada filtró (openspec: refine-advanced-search-phase3).

export interface MetaSegment {
  text: string | null | undefined;
  hit?: boolean;
}

export function MetaLine({ segments, className = "" }: { segments: MetaSegment[]; className?: string }) {
  const shown = segments.filter((segment): segment is { text: string; hit?: boolean } => Boolean(segment.text));
  if (shown.length === 0) return null;
  return (
    <span className={`font-data text-xs text-paper-muted ${className}`}>
      {shown.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 ? " · " : null}
          {segment.hit ? <span className="text-amber">{segment.text}</span> : segment.text}
        </Fragment>
      ))}
    </span>
  );
}
