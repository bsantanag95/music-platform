import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import UsersPage from "./page";
import { UserSearch } from "@/components/social/UserSearch";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const resolveSession = vi.fn();
vi.mock("@/services/auth/sessions", () => ({
  resolveSession: () => resolveSession(),
}));

// Se stubbea UserSearch para no arrastrar su cadena de imports cliente
// (@/i18n/navigation) bajo Node. La identidad del componente se conserva: el
// page renderiza este mismo módulo mockeado.
vi.mock("@/components/social/UserSearch", () => ({
  UserSearch: () => null,
}));

// Los Server Components async devuelven el árbol sin ejecutar los hijos: se
// inspecciona el elemento <UserSearch /> para leer sus props (patrón usado en
// AuthenticatedHome.test).
function findElement(node: unknown, type: unknown): { props?: Record<string, unknown> } | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return element as { props?: Record<string, unknown> };
  return findElement((element.props as { children?: ReactNode } | undefined)?.children, type);
}

describe("UsersPage", () => {
  it("propaga el término de la URL como initialQuery recortado", async () => {
    resolveSession.mockResolvedValue(null);
    const element = await UsersPage({ searchParams: Promise.resolve({ q: "  ana  " }) });
    const search = findElement(element, UserSearch);

    expect(search?.props?.initialQuery).toBe("ana");
    expect(search?.props?.authenticated).toBe(false);
  });

  it("sin q, deja initialQuery vacío", async () => {
    resolveSession.mockResolvedValue(null);
    const element = await UsersPage({ searchParams: Promise.resolve({}) });
    const search = findElement(element, UserSearch);

    expect(search?.props?.initialQuery).toBe("");
  });

  it("marca authenticated cuando hay sesión", async () => {
    resolveSession.mockResolvedValue({ user: { id: "u1", username: "yo", displayName: null } });
    const element = await UsersPage({ searchParams: Promise.resolve({}) });
    const search = findElement(element, UserSearch);

    expect(search?.props?.authenticated).toBe(true);
  });
});
