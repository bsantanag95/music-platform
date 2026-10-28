import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FeedList } from "./FeedList";
import type { AuthorSummary, FeedEntry, FeedResponse } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({ getFeed: vi.fn(), markFeedSeen: vi.fn() }));

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
  return { ...actual, getFeed: mocks.getFeed, markFeedSeen: mocks.markFeedSeen };
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

function chip(name: string) {
  return within(screen.getByRole("group", { name: "Filtrar por tipo" })).getByRole("button", { name });
}

function person(name: string | RegExp) {
  return within(screen.getByRole("group", { name: "Personas" })).getByRole("button", { name });
}
const initial: FeedResponse = { entries: [favorite(), comment()], page: 1, pageSize: 20, hasNext: false };

describe("FeedList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markFeedSeen.mockResolvedValue({ ok: true });
    window.history.replaceState(null, "", "/es/me/feed");
  });

  it("lista las entradas iniciales sin pedir datos al servidor", () => {
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    expect(screen.getByText("Currents")).toBeInTheDocument();
    expect(screen.getByText("Un discazo")).toBeInTheDocument();
    expect(mocks.getFeed).not.toHaveBeenCalled();
  });

  it("sin seguidos: dice que no sigue a nadie y ofrece buscar personas, sin barra de filtros", () => {
    renderWithQuery(<FeedList initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }} authors={[]} />);

    expect(screen.getByText("Todavía no sigues a nadie")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar personas" })).toHaveAttribute("href", "/users");
    expect(screen.queryByRole("group", { name: "Filtrar por tipo" })).not.toBeInTheDocument();
  });

  it("con seguidos sin actividad: lo dice y ofrece ver la comunidad", () => {
    renderWithQuery(<FeedList initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }} authors={authors} />);

    expect(screen.getByText("La gente que sigues todavía no publicó nada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la comunidad" })).toHaveAttribute("href", "/activity");
    expect(screen.queryByRole("link", { name: "Buscar personas" })).not.toBeInTheDocument();
  });

  it("la franja de personas no aparece si no hay seguidos", () => {
    renderWithQuery(<FeedList initial={initial} authors={[]} />);
    expect(screen.queryByRole("group", { name: "Personas" })).not.toBeInTheDocument();
  });

  it("sin filtros, la franja tiene elegida «Todas» y los chips «Todo»", () => {
    renderWithQuery(<FeedList initial={initial} authors={authors} />);
    expect(person("Todas")).toHaveAttribute("aria-pressed", "true");
    expect(chip("Todo")).toHaveAttribute("aria-pressed", "true");
    // Los nueve tipos del feed, más "Todo".
    expect(within(screen.getByRole("group", { name: "Filtrar por tipo" })).getAllByRole("button")).toHaveLength(10);
  });

  it("registra la visita al montarse", () => {
    renderWithQuery(<FeedList initial={initial} authors={authors} />);
    expect(mocks.markFeedSeen).toHaveBeenCalledTimes(1);
  });

  it("marca a quien tiene novedades y lo pone primero", () => {
    renderWithQuery(<FeedList initial={initial} authors={authors} authorsWithNews={[otherAuthor.id]} />);
    const buttons = within(screen.getByRole("group", { name: "Personas" })).getAllByRole("button");
    // "Todas", luego Ana (con novedades) antes que Fran.
    expect(buttons[1]).toHaveAccessibleName("Ana, tiene actividad nueva");
    expect(buttons[2]).toHaveAccessibleName("Fran");
  });

  it("elegir otra vez a la persona activa vuelve a «Todas»", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [comment()], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.click(person("Fran"));
    await waitFor(() => expect(window.location.search).toBe("?author=fran"));
    await user.click(person("Fran"));

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(person("Todas")).toHaveAttribute("aria-pressed", "true");
  });

  it("agrupa lo posterior a la última visita bajo «Nuevo desde tu última visita»", () => {
    renderWithQuery(<FeedList initial={{ ...initial, entries: [comment(), favorite()] }} authors={authors} lastVisitAt="2026-01-01T12:00:00.000Z" />);
    const heading = screen.getByRole("heading", { name: "Nuevo desde tu última visita" });
    expect(heading).toBeInTheDocument();
    // El comentario (2/1) es posterior a la marca; el favorito (1/1, 00:00) no.
    const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const commentRow = screen.getByText("Un discazo");
    const favoriteRow = screen.getByText("Currents");
    const earlier = screen.getByRole("heading", { name: "Antes" });
    expect(follows(heading, commentRow)).toBe(true);
    expect(follows(commentRow, earlier)).toBe(true);
    expect(follows(earlier, favoriteRow)).toBe(true);
  });

  it("sin visita anterior no hay bloque de novedades", () => {
    renderWithQuery(<FeedList initial={initial} authors={authors} />);
    expect(screen.queryByRole("heading", { name: "Nuevo desde tu última visita" })).not.toBeInTheDocument();
  });

  it("arranca con los filtros de la URL y no vuelve a pedir la página que trajo el servidor", () => {
    renderWithQuery(
      <FeedList initial={initial} authors={authors} initialFilters={{ kind: "comment", author: "ana", q: "kid" }} />,
    );

    expect(chip("Comentarios")).toHaveAttribute("aria-pressed", "true");
    expect(person("Ana")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByPlaceholderText("Buscar por artista, álbum o canción")).toHaveValue("kid");
    expect(screen.getByText("Currents")).toBeInTheDocument();
    expect(mocks.getFeed).not.toHaveBeenCalled();
  });

  it("escribe los filtros activos en la URL sin crear historial", async () => {
    const user = userEvent.setup();
    const historyLength = window.history.length;
    mocks.getFeed.mockResolvedValue({ entries: [comment()], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.click(chip("Reseñas"));
    await user.click(person("Fran"));

    await waitFor(() => expect(window.location.search).toBe("?kind=review&author=fran"));
    expect(window.history.length).toBe(historyLength);

    await user.click(screen.getByText("Limpiar filtros"));
    await waitFor(() => expect(window.location.search).toBe(""));
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

  it("elegir un chip de tipo filtra por ese kind", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [comment()], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.click(chip("Comentarios"));

    await waitFor(() =>
      expect(mocks.getFeed).toHaveBeenCalledWith(1, 20, { ...NO_FILTERS, kind: "comment" }),
    );
  });

  it("combina el filtro de autor con el de tipo", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.click(chip("Favoritos"));
    await user.click(person("Ana"));

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

    await user.click(chip("Listas"));

    await waitFor(() => expect(screen.getByText("Sin resultados para estos filtros")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Buscar personas" })).not.toBeInTheDocument();
  });

  it("limpiar filtros vuelve a traer todo", async () => {
    const user = userEvent.setup();
    mocks.getFeed.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
    renderWithQuery(<FeedList initial={initial} authors={authors} />);

    await user.click(chip("Listas"));
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

    await user.click(chip("Comentarios"));

    await waitFor(() => expect(mocks.getFeed).toHaveBeenCalled());
    expect(screen.queryByText("Estás al día")).not.toBeInTheDocument();
  });
});
