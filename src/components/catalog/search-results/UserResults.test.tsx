import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { UserSearchResult } from "@/lib/api/schemas";
import { UserResults } from "./UserResults";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn() }));

const user = (overrides: Partial<UserSearchResult>): UserSearchResult => ({
  id: "00000000-0000-4000-8000-000000000001",
  username: "ana",
  displayName: null,
  profileVisibility: "public",
  avatarUrl: null,
  relation: "none",
  followersCount: 12,
  inCommon: 0,
  ...overrides,
});

describe("UserResults (refine-search-results-phase3)", () => {
  it("sin sesión: un solo aviso arriba y ningún botón para seguir por fila", () => {
    renderWithIntl(
      <UserResults
        query="an"
        authenticated={false}
        initialUsers={[user({}), user({ id: "00000000-0000-4000-8000-000000000002", username: "andre" })]}
        initialHasNext={false}
      />,
    );
    expect(screen.getByRole("link", { name: "Inicia sesión" })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("button", { name: /seguir/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("12 seguidores")).toHaveLength(2);
  });

  it("con sesión: seguidores, en común y 'Perfil privado' sin cifras", () => {
    renderWithIntl(
      <UserResults
        query="an"
        authenticated
        initialUsers={[
          user({ inCommon: 2 }),
          user({ id: "00000000-0000-4000-8000-000000000002", username: "andre", profileVisibility: "private", followersCount: null }),
        ]}
        initialHasNext={false}
      />,
    );
    expect(screen.getByText("12 seguidores · 2 en común")).toBeInTheDocument();
    expect(screen.getByText("Perfil privado")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Inicia sesión" })).not.toBeInTheDocument();
  });
});
