"use client";

import type { ReactNode } from "react";
import { usePathname } from "@/i18n/navigation";
import { isFocusRoute } from "@/lib/focus-routes";

interface FooterSlotProps {
  /** Pie completo del sitio. */
  full: ReactNode;
  /** Pie reducido de las pantallas de foco (atribución y enlaces legales). */
  minimal: ReactNode;
}

// El pie global vive en el layout, que no sabe en qué ruta está; los dos pies llegan ya renderizados
// por el servidor y aquí se elige uno según la ruta (como hace el Header por dentro). El elegido
// sale ya en el HTML del servidor; al navegar desde/hacia una pantalla de foco el layout persiste
// y solo cambia cuál se muestra.
export function FooterSlot({ full, minimal }: FooterSlotProps) {
  const pathname = usePathname();
  return <>{isFocusRoute(pathname) ? minimal : full}</>;
}
