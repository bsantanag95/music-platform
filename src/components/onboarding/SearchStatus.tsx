interface SearchStatusProps {
  /** Hay texto suficiente para buscar; si no, no se dice nada. */
  searchable: boolean;
  pending: boolean;
  failed: boolean;
  /** Resultados visibles (ya sin los elegidos). */
  resultCount: number;
  labels: { searching: string; noResults: string; error: string };
}

// Estado de la búsqueda de los buscadores del onboarding. Siempre montado como región `status`
// (polite) para que los lectores de pantalla anuncien "Buscando…" / "Sin resultados" al cambiar
// el texto. Un fallo de búsqueda se dice como error, nunca como "Sin resultados".
export function SearchStatus({ searchable, pending, failed, resultCount, labels }: SearchStatusProps) {
  let content: React.ReactNode = null;
  if (searchable) {
    if (pending && resultCount === 0) {
      content = (
        <span className="flex items-center gap-2 text-paper-muted">
          <span aria-hidden="true" className="inline-block size-3 animate-spin rounded-full border-2 border-ink-border border-t-amber" /> {labels.searching}
        </span>
      );
    } else if (failed && resultCount === 0) {
      content = <span className="text-danger">{labels.error}</span>;
    } else if (!pending && resultCount === 0) {
      content = <span className="text-paper-muted">{labels.noResults}</span>;
    } else if (pending) {
      content = (
        <span className="flex items-center gap-2 text-paper-muted">
          <span aria-hidden="true" className="inline-block size-3 animate-spin rounded-full border-2 border-ink-border border-t-amber" /> {labels.searching}
        </span>
      );
    }
  }
  return (
    <div role="status" aria-live="polite" className="font-data text-xs">
      {content}
    </div>
  );
}
