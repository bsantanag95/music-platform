import type { ReactNode } from "react";

type NoticeTone = "success" | "info" | "removed";

interface ActionNoticeProps {
  tone: NoticeTone;
  /** Titular corto: qué pasó ("Valoración guardada"). */
  title: string;
  /** Sobre qué pasó: el título del objetivo y, si aplica, el valor guardado. */
  detail?: ReactNode;
}

// Confirmación de una acción del diálogo "Añadir". Antes era una línea de texto plano del
// mismo tamaño que el resto del panel y, en Valorar, quedaba debajo del botón en `text-xs`:
// la persona no notaba que la acción se había hecho. Ahora es una tarjeta con ícono, titular y
// detalle, que entra con una animación corta (solo con movimiento permitido).
//
// Tonos: `success` (se hizo algo nuevo; petróleo, el acento secundario: el ámbar queda para la
// selección y la nota), `info` (ya estaba hecho) y `removed` (se deshizo), ambos neutros.
// El padre la monta con un `key` distinto en cada guardado para que la animación se repita.
export function ActionNotice({ tone, title, detail }: ActionNoticeProps) {
  const styles: Record<NoticeTone, { box: string; badge: string }> = {
    success: { box: "border-petrol/50 bg-petrol/10", badge: "bg-petrol text-ink" },
    info: { box: "border-ink-border bg-ink/60", badge: "bg-ink-border text-paper" },
    removed: { box: "border-ink-border bg-ink/60", badge: "bg-ink-border text-paper-muted" },
  };

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 motion-safe:animate-[notice-in_320ms_cubic-bezier(0.16,1,0.3,1)_both] ${styles[tone].box}`}
    >
      <span
        aria-hidden="true"
        className={`grid size-7 shrink-0 place-items-center rounded-full ${styles[tone].badge}`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          {tone === "success" ? (
            // El trazo se dibuja al entrar (`pathLength` normaliza la longitud a 1).
            <path
              d="M5 12.5 10 17.5 19 7"
              pathLength={1}
              className="[stroke-dasharray:1] motion-safe:animate-[notice-check_360ms_120ms_ease-out_both]"
            />
          ) : tone === "info" ? (
            <path d="M12 11v6M12 7.5v.01" />
          ) : (
            <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          )}
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block font-display text-sm text-paper">{title}</span>
        {detail ? <span className="block truncate font-data text-xs text-paper-muted">{detail}</span> : null}
      </span>
    </div>
  );
}
