import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CollectionList } from "./CollectionList";
import type { CollectionEntry, CollectionListResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    getMyCollection: vi.fn(),
    getUserCollection: vi.fn(),
    removeCollectionEntry: vi.fn(),
    ApiError,
  };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/api/collection", () => ({
  getMyCollection: mocks.getMyCollection,
  getUserCollection: mocks.getUserCollection,
  removeCollectionEntry: mocks.removeCollectionEntry,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

function entry(overrides: Partial<CollectionEntry> = {}): CollectionEntry {
  return {
    id: crypto.randomUUID(),
    format: "vinyl",
    attributes: ["limited-edition"],
    note: "portada alternativa",
    audience: "followers",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    album: {
      id: "00000000-0000-4000-8000-0000000000a1",
      title: "The Dark Side of the Moon",
      coverThumbUrl: null,
      artistId: "00000000-0000-4000-8000-0000000000b1",
      artistName: "Pink Floyd",
    },
    ...overrides,
  };
}

function response(entries: CollectionEntry[], hasNext = false): CollectionListResponse {
  return { entries, page: 1, pageSize: 20, hasNext };
}

describe("CollectionList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío localizado cuando no hay entradas", () => {
    renderWithIntl(<CollectionList initial={response([])} />);
    expect(screen.getByText("Todavía no agregaste discos a tu colección")).toBeInTheDocument();
  });

  it("renderiza las entradas con formato, atributos y nota", () => {
    renderWithIntl(<CollectionList initial={response([entry()])} />);
    expect(screen.getByRole("link", { name: "The Dark Side of the Moon" })).toBeInTheDocument();
    expect(screen.getByText("Vinilo", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Edición limitada", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("portada alternativa")).toBeInTheDocument();
  });

  it("filtra por formato llamando a la API con el filtro", async () => {
    const user = userEvent.setup();
    mocks.getMyCollection.mockResolvedValue(response([entry({ format: "cd", attributes: [] })]));
    renderWithIntl(<CollectionList initial={response([entry()])} />);

    await user.selectOptions(screen.getByLabelText("Formato"), "cd");

    await waitFor(() =>
      expect(mocks.getMyCollection).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, format: "cd" }),
      ),
    );
  });

  it("pagina con Cargar más", async () => {
    const user = userEvent.setup();
    mocks.getMyCollection.mockResolvedValue(response([entry()], false));
    renderWithIntl(<CollectionList initial={response([entry()], true)} />);

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() =>
      expect(mocks.getMyCollection).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it("en modo lectura no muestra filtros ni botón de quitar", () => {
    renderWithIntl(
      <CollectionList initial={response([entry()])} readOnly username="nick" />,
    );
    expect(screen.queryByLabelText("Formato")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar" })).not.toBeInTheDocument();
  });

  it("quita una entrada propia", async () => {
    const user = userEvent.setup();
    const only = entry();
    mocks.removeCollectionEntry.mockResolvedValue(null);
    renderWithIntl(<CollectionList initial={response([only])} />);

    await user.click(screen.getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(mocks.removeCollectionEntry).toHaveBeenCalledWith(only.id));
  });
});
