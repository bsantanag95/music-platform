"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTimeZone, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { fetchNotificationCount, markNotificationsSeen } from "./api";
import { NotificationPanel } from "./NotificationPanel";
import { NOTIFICATIONS_COUNT_KEY } from "./query-keys";

interface NotificationBellProps {
  /** Contador calculado en el servidor, para que el primer render no parpadee. */
  initialCount: number;
  /**
   * `desktop` abre el panel; `mobile` es un enlace a la página. El Header
   * monta uno u otro según el breakpoint, no el componente: el panel flotante
   * no cabe en 375 px junto al panel del Header (D8).
   */
  variant?: "desktop" | "mobile";
}

/**
 * Contador de la campana. Se refresca cada minuto mientras la pestaña está
 * visible, sin refetch en segundo plano (D7); al recuperar el foco también se
 * actualiza, porque TanStack Query lo hace por defecto.
 */
function useNotificationCount(initialCount: number) {
  const timeZone = useTimeZone();
  return useQuery({
    queryKey: NOTIFICATIONS_COUNT_KEY,
    queryFn: () => fetchNotificationCount(timeZone),
    initialData: { count: initialCount },
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function NotificationBell({ initialCount, variant = "desktop" }: NotificationBellProps) {
  const t = useTranslations("notifications");
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { data } = useNotificationCount(initialCount);
  const count = data?.count ?? initialCount;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const label =
    count > 0 ? t("bell.labelWithCount", { count }) : t("bell.label");

  // Cierra al navegar: cualquier enlace del panel cambia de ruta.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  // Abrir la campana pone el contador a cero (D6); las entradas siguen sin
  // leer. El cero es optimista: si el PUT falla, el próximo sondeo lo corrige.
  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    queryClient.setQueryData(NOTIFICATIONS_COUNT_KEY, { count: 0 });
    void markNotificationsSeen().catch(() => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_COUNT_KEY });
    });
  };

  if (variant === "mobile") {
    return (
      <Link
        href="/me/notifications"
        aria-label={label}
        className="relative flex size-9 shrink-0 items-center justify-center rounded-md text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper"
      >
        <BellIcon />
        <CountBadge count={count} />
      </Link>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={toggle}
        className={`relative flex size-9 shrink-0 items-center justify-center rounded-md text-paper-muted transition-colors hover:bg-ink-surface hover:text-paper ${
          open ? "bg-ink-surface text-paper" : ""
        }`}
      >
        <BellIcon />
        <CountBadge count={count} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 w-[22rem] max-w-[calc(100vw-2rem)] pt-2">
          <NotificationPanel id={panelId} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

/** Tope visible "9+" (D6): la cifra no se convierte en un marcador de logro. */
function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-amber px-1 text-center font-data text-[10px] font-medium leading-4 text-ink">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
