import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Distinto de EmptyState: acá sí es apropiado ofrecer reintentar. Nunca
 * muestra el mensaje crudo del backend (`ApiError.message`) — el mensaje
 * de este componente viene del diccionario del frontend que mapea
 * `ApiError.code`, no del texto en español del servidor (ver
 * docs/02-architecture/frontend-plan/03-best-practices.md).
 */
export function ErrorState({
  title = "Algo salió mal",
  description = "No pudimos completar la solicitud. Probá de nuevo en un momento.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-danger/40 bg-ink-surface px-6 py-12 text-center">
      <h3 className="font-display text-lg text-paper">{title}</h3>
      <p className="max-w-sm font-body text-sm text-paper-muted">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}
