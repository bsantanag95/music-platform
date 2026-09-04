interface SpinnerProps {
  label: string;
  className?: string;
}

// Indicador de carga circular: anillo con un cuarto en ámbar que gira. Sin
// dependencias ni glifos unicode como icono — trazo propio, coherente con el
// resto del lenguaje visual (Regla de Rareza: el ámbar solo aparece activo).
export function Spinner({ label, className = "size-5" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-2 border-ink-border border-t-amber ${className}`}
    />
  );
}
