import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FeedList } from "./FeedList";
import type { AuthorSummary, FeedEntry, FeedResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({ getFeed: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ cover, label }: { cover: string | null; label: string }) => (
    <span data-testid="cover-thumb" data-cover={cover ?? ""}>
      {label}
    </span>
  ),
}));
vi.mock("@/lib/api/diary", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/diary")>();
  return { ...actual, getFeed: mocks.getFeed };
});

const NO_FILTERS = { kind: undefined, authorId: undefined, q: undefined };

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const author = { id: "a1b2c3d4-0000-4000-8000-000000000001", username: "fran", displayName: "Fran" };
const otherAuthor = { id: "a1b2c3d4-0000-4000-8000-000000000002", username: "ana", displayName: "Ana" };

function favorite(overrides: Partial<Extract<FeedEntry, { kind: "favorite" }>> = {}): FeedEntry {
  return {
    kind: "favorite",
    id: "a1b2c3d4-0000-4000-8000-000000000010",
    targetType: "release-group",
    audience: "public",
    createdAt: "2026-01-01T00:00:00.000Z",
    target: { id: "rg1", title: "Currents", artistName: "Tame Impala", coverThumbUrl: null },
    author,
    ...overrides,
  };
}

function comment(overrides: Partial<Extract<FeedEntry, { kind: "comment" }>> = {}): FeedEntry {
  return {
    kind: "comment",
    id: "a1b2c3d4-0000-4000-8000-000000000011",
    body: "Un discazo",
    createdAt: "2026-01-02T00:00:00.000Z",
    target: { type: "release-group", id: "rg2", title: "Kid A", artistName: "Radiohead", coverThumbUrl: null },
    author,
    ...overrides,
  };
}

const authors: AuthorSummary[] = [author, otherAuthor];
const initial: FeedResponse = { entries: [favorite(), comment()], page: 1, pageSize: 20, hasNext: false };

describe("FeedList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista las entradas iniciales sin pedir datos al servidor", () => {
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    expect(screen.getByText("Currents")).toBeInTheDocument();
    expect(screen.getByText("Un discazo")).toBeInTheDocument();
    expect(mocks.getFeed).not.toHaveBeenCalled();
  });

  it("estado vacío real: muestra el CTA para buscar personas", () => {
    renderWithQuery(
      <FeedList
        initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }}
        authors={[]}
        empty={{ title: "Nada para ver todavía", description: "Seguí a alguien." }}
      />,
    );

    expect(screen.getByText("Nada para ver todavía")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: "Buscar personas" });
    expect(cta).toHaveAttribute("href", "/users");
  });

  it("el <select> de autor no aparece si no hay seguidos", () => {
    renderWithQuery(<FeedList initial={initial} authors={[]} />);
    expect(screen.queryByLabelText("Autor")).not.toBeInTheDocument();
  });

  it("buscar texto dispara una nueva query con `q`, tras el debounce", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [comment()], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.type(screen.getByPlaceholderText("Buscar por artista, álbum o canción"), "radiohead");

    await waitFor(
      () => expect(mocks.getFeed).toHaveBeenCalledWith(1, 20, { ...NO_FILTERS, q: "radiohead" }),
      { timeout: 1000 },
    );
  });

  it("cambiar el select de tipo filtra por ese kind", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [comment()], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.selectOptions(screen.getByLabelText("Tipo"), "comment");

    await waitFor(() =>
      expect(mocks.getFeed).toHaveBeenCalledWith(1, 20, { ...NO_FILTERS, kind: "comment" }),
    );
  });

  it("combina el filtro de autor con el de tipo", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.selectOptions(screen.getByLabelText("Tipo"), "favorite");
    await user.selectOptions(screen.getByLabelText("Autor"), otherAuthor.id);

    await waitFor(() =>
      expect(mocks.getFeed).toHaveBeenLastCalledWith(1, 20, {
        ...NO_FILTERS,
        kind: "favorite",
        authorId: otherAuthor.id,
      }),
    );
  });

  it("sin resultados para los filtros muestra un vacío distinto del feed realmente vacío", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.selectOptions(screen.getByLabelText("Tipo"), "list");

    await waitFor(() => expect(screen.getByText("Sin resultados para estos filtros")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Buscar personas" })).not.toBeInTheDocument();
  });

  it("limpiar filtros vuelve a traer todo", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.selectOptions(screen.getByLabelText("Tipo"), "list");
    await waitFor(() => expect(screen.getByText("Limpiar filtros")).toBeInTheDocument());

    await user.click(screen.getByText("Limpiar filtros"));

    expect(screen.getByText("Currents")).toBeInTheDocument();
    expect(screen.queryByText("Limpiar filtros")).not.toBeInTheDocument();
  });

  it("carga más páginas al pulsar el botón y anuncia la cantidad cargada", async () => {
    const user = userEvent.setup();
    const initialWithNext = { ...initial, hasNext: true };
    mocks.getFeed.mockResolvedValue({ entries: [favorite({ id: "a1b2c3d4-0000-4000-8000-000000000012" })], page: 2, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initialWithNext} authors={authors} />);

    await user.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() => expect(mocks.getFeed).toHaveBeenCalledWith(2, 20, NO_FILTERS));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Se cargó 1 entrada nueva"));
    expect(screen.getByRole("status").className).toMatch(/sr-only/);
  });

  it("al llegar al final sin filtros, muestra el mensaje de cierre", () => {
    renderWithQuery(<FeedList initial={initial} authors={authors} />);
    expect(screen.getByText("Estás al día")).toBeInTheDocument();
  });

  it("no muestra el mensaje de cierre mientras hay filtros activos", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [comment()], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.selectOptions(screen.getByLabelText("Tipo"), "comment");

    await waitFor(() => expect(mocks.getFeed).toHaveBeenCalled());
    expect(screen.queryByText("Estás al día")).not.toBeInTheDocument();
  });
});
