import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { UserListSummary } from "@/lib/api/schemas";
import { ListsCarousel } from "./ListsCarousel";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("@/lib/api/lists", () => ({ saveList: vi.fn(), unsaveList: vi.fn() }));

let seq = 0;
function list(overrides: Partial<UserListSummary> = {}): UserListSummary {
  seq += 1;
  return {
    id: `a1b2c3d4-0000-4000-8000-0000000000${String(seq).padStart(2, "0")}`,
    entityType: "release-group",
    title: `Lista ${seq}`,
    description: null,
    audience: "public",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    itemCount: 3,
    coverThumbs: [],
    pinned: false,
    ...overrides,
  };
}

function renderCarousel(lists: UserListSummary[], totalCount: number) {
  const client = new QueryClient();
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <ListsCarousel lists={lists} username="ana" totalCount={totalCount} />
    </QueryClientProvider>,
  );
}

describe("ListsCarousel", () => {
  beforeEach(() => {
    seq = 0;
  });

  it("renderiza una tarjeta por lista, enlazada a la lista del dueño", () => {
    renderCarousel([list(), list()], 2);
    expect(screen.getByRole("link", { name: "Lista 1" })).toHaveAttribute(
      "href",
      "/users/ana/lists/a1b2c3d4-0000-4000-8000-000000000001",
    );
    expect(screen.getByRole("list", { name: "Listas del perfil" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("marca como 'Fijada' la lista que el dueño fijó", () => {
    renderCarousel([list({ pinned: true }), list()], 2);
    expect(screen.getAllByText("Fijada")).toHaveLength(1);
  });

  it("con más listas que las del riel, cierra con la puerta a la página dedicada", () => {
    renderCarousel([list(), list()], 23);
    const gate = screen.getByRole("link", { name: /Ver las 23 listas/ });
    expect(gate).toHaveAttribute("href", "/users/ana/lists");
    expect(screen.getByText("+21")).toBeInTheDocument();
  });

  it("si caben todas, no hay puerta", () => {
    renderCarousel([list(), list()], 2);
    expect(screen.queryByRole("link", { name: /Ver las/ })).not.toBeInTheDocument();
  });
});
