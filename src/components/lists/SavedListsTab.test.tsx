import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SavedListsTab } from "./SavedListsTab";
import type { SavedListsResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({ getSavedLists: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span /> }));
vi.mock("./SaveListButton", () => ({ SaveListButton: () => <button type="button">save</button> }));
vi.mock("@/lib/api/lists", () => ({ getSavedLists: mocks.getSavedLists }));

function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const owner = { id: "o1", username: "otra", displayName: "Otra" };
const NO_COUNTS = { artist: 0, "release-group": 0, recording: 0 };

function saved(overrides: Partial<SavedListsResponse> = {}): SavedListsResponse {
  return {
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
        tracking: false,
        unavailable: true,
      },
    ],
    page: 1,
    pageSize: 20,
    hasNext: false,
    counts: { artist: 1, "release-group": 0, recording: 0 },
    ...overrides,
  };
}

describe("SavedListsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/me/lists?tab=saved");
  });

  it("muestra el estado vacío cuando no hay guardadas, sin barra", () => {
    wrap(<SavedListsTab initial={{ lists: [], page: 1, pageSize: 20, hasNext: false, counts: NO_COUNTS }} />);
    expect(screen.getByText("Todavía no guardaste listas")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("marca 'ya no disponible' una lista guardada que dejó de verse", () => {
    wrap(<SavedListsTab initial={saved()} />);
    expect(screen.getByText("Ya no disponible")).toBeInTheDocument();
  });

  // openspec: redesign-me-lists-toolbar
  it("filtra por tipo en el servidor y escribe el filtro en la URL", async () => {
    mocks.getSavedLists.mockResolvedValue(saved({ lists: [] }));
    wrap(<SavedListsTab initial={saved({ counts: { artist: 1, "release-group": 2, recording: 0 } })} />);

    expect(screen.getByRole("button", { name: /Canciones/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Álbumes/ }));

    await waitFor(() =>
      expect(mocks.getSavedLists).toHaveBeenCalledWith(1, 20, expect.objectContaining({ entityType: "release-group" })),
    );
    expect(window.location.search).toBe("?tab=saved&type=release-group");
    expect(await screen.findByText("Ninguna de tus listas guardadas coincide con esos filtros.")).toBeInTheDocument();
  });
});
