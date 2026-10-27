import type { ReactNode } from "react";
import { vi } from "vitest";
import { ProgressSectionContext } from "./ProgressSection";

// Proveedor del contexto de `ProgressSection` para probar un listado sin montar la sección (ni el diálogo de acciones
// rápidas).
export function ProgressSectionTestProvider({
  reportTotal = vi.fn(),
  openPrimary = vi.fn(),
  children,
}: {
  reportTotal?: (tab: "discographies" | "lists" | "following", total: number) => void;
  openPrimary?: () => void;
  children: ReactNode;
}) {
  return <ProgressSectionContext.Provider value={{ reportTotal, openPrimary }}>{children}</ProgressSectionContext.Provider>;
}
