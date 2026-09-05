import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SavedListsTab } from "./SavedListsTab";
import { DiscoverListsTab } from "./DiscoverListsTab";
import type { DiscoverListsResponse, SavedListsResponse } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("./SaveListButton", () => ({ SaveListButton: () => <button type="button">save</button> }));
vi.mock("@/components/feed/feed-row-parts", () => ({ RelativeDate: () => <time>hace poco</time> }));
vi.mock("@/lib/api/lists", () => ({ getSavedLists: vi.fn(), getDiscoverLists: vi.fn() }));

function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const owner = { id: "o1", username: "otra", displayName: "Otra" };

describe("SavedListsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay guardadas", () => {
    wrap(<SavedListsTab initial={{ lists: [], page: 1, pageSize: 20, hasNext: false }} />);
    expect(screen.getByText("Todavía no guardaste listas")).toBeInTheDocument();
  });

  it("marca 'ya no disponible' una lista guardada que dejó de verse", () => {
    const initial: SavedListsResponse = {
      lists: [
        {
          id: "a1b2c3d4-0000-4000-8000-000000000001",
          entityType: "artist",
          title: "Bandas",
          description: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          itemCount: 2,
          coverThumbs: [],
          owner,
          following: false,
          unavailable: true,
        },
      ],
      page: 1,
      pageSize: 20,
      hasNext: false,
    };
    wrap(<SavedListsTab initial={initial} />);
    expect(screen.getByText("Ya no disponible")).toBeInTheDocument();
  });
});

describe("DiscoverListsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay listas públicas", () => {
    wrap(<DiscoverListsTab initial={{ lists: [], page: 1, pageSize: 20, hasNext: false }} />);
    expect(screen.getByText("Todavía no hay listas públicas")).toBeInTheDocument();
  });

  it("renderiza una lista pública con su dueño", () => {
    const initial: DiscoverListsResponse = {
      lists: [
        {
          id: "a1b2c3d4-0000-4000-8000-000000000002",
          entityType: "release-group",
          title: "Lo mejor de 2026",
          description: null,
          createdAt: "2026-03-01T00:00:00.000Z",
          updatedAt: "2026-03-01T00:00:00.000Z",
          itemCount: 10,
          coverThumbs: [],
          owner,
          saved: false,
          following: false,
        },
      ],
      page: 1,
      pageSize: 20,
      hasNext: false,
    };
    wrap(<DiscoverListsTab initial={initial} />);
    expect(screen.getByText("Lo mejor de 2026")).toBeInTheDocument();
    expect(screen.getByText("por Otra")).toBeInTheDocument();
  });
});
