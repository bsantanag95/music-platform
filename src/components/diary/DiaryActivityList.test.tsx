import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { DiaryActivityList } from "./DiaryActivityList";
import type { DiaryListResponse, ListenEntry } from "@/lib/api/schemas";

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
    updateListenEntry: vi.fn(),
    deleteListenEntry: vi.fn(),
    getMyDiary: vi.fn(),
    ApiError,
  };
});

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
vi.mock("@/lib/api/diary", () => ({
  updateListenEntry: mocks.updateListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
  getMyDiary: mocks.getMyDiary,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

const NO_FILTERS = { q: undefined, context: undefined, reaction: undefined, audience: undefined };

function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const liked: ListenEntry = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  listenContext: "first_listen",
  body: "El bajo está ridículamente bueno",
  reaction: "liked",
  audience: "followers",
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "artist", id: "a1b2c3d4-0000-4000-8000-000000000002", title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};
const neutral: ListenEntry = {
  id: "a1b2c3d4-0000-4000-8000-000000000003",
  listenContext: "relisten",
  body: null,
  reaction: "neutral",
  audience: "public",
  createdAt: "2026-01-02T00:00:00.000Z",
  target: { type: "release-group", id: "a1b2c3d4-0000-4000-8000-000000000004", title: "Kid A", subtitle: null, coverThumbUrl: "https://cover/kid-a.jpg" },
};

function plainListen(id: string, title: string): ListenEntry {
  return {
    id,
    listenContext: "relisten",
    body: null,
    reaction: null,
    audience: "public",
    createdAt: "2026-01-03T00:00:00.000Z",
    target: { type: "recording", id: `target-${id}`, title, subtitle: null, coverThumbUrl: null },
  };
}

const initial: DiaryListResponse = { entries: [liked, neutral], page: 1, pageSize: 20, hasNext: true };

describe("DiaryActivityList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay escuchas", () => {
    renderWithQuery(<DiaryActivityList initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }} />);
    expect(screen.getByText("Todavía no escuchaste nada")).toBeInTheDocument();
  });

  it("lista las entradas con objetivo, contexto y reacción, sin pedir datos al servidor", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    const list = within(screen.getByRole("list"));
    expect(list.getByText("Pink Floyd")).toBeInTheDocument();
    expect(list.getByText(/Primera escucha/)).toBeInTheDocument();
    expect(list.getByText("Me gustó")).toBeInTheDocument();
    expect(list.getByText("Neutro")).toBeInTheDocument();
    expect(list.getByText("Kid A")).toBeInTheDocument();
    expect(mocks.getMyDiary).not.toHaveBeenCalled();
  });

  it("abre cada fila con la celda de carátula del objetivo, o el disco cuando no tiene", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    const cells = screen.getAllByTestId("cover-thumb");
    expect(cells).toHaveLength(2);
    expect(cells[0]).toHaveAttribute("data-cover", ""); // artista → disco
    expect(cells[1]).toHaveAttribute("data-cover", "https://cover/kid-a.jpg"); // álbum → carátula
  });

  it("una entrada con impresión la muestra como cita entre comillas; sin impresión, no la muestra", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    expect(screen.getByText("“El bajo está ridículamente bueno”")).toBeInTheDocument();
  });

  it("la cita es un párrafo con regla neutra a la izquierda y cursiva, sin caja ni fondo", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    const quote = screen.getByText("“El bajo está ridículamente bueno”");
    expect(quote.tagName).toBe("P");
    expect(quote.className).toMatch(/border-l/);
    expect(quote.className).toMatch(/italic/);
    expect(quote.className).not.toMatch(/bg-ink-surface/);
    expect(quote.className).not.toMatch(/rounded/);
  });

  it("la reacción se alinea por baseline junto al contexto, no como texto corrido", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    const badge = within(screen.getByRole("list")).getByText("Me gustó").closest("span.inline-flex");
    // flex item bajo `items-baseline`, no texto mezclado: evita que el ícono SVG
    // desplace el badge respecto a la línea de base del contexto/audiencia vecinos.
    expect(badge?.parentElement?.className).toMatch(/items-baseline/);
  });

  it("la audiencia vive junto a la fecha y las acciones, no en el cluster de contexto/reacción", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    const listEl = screen.getByRole("list");
    const list = within(listEl);
    const audience = list.getAllByText("Seguidores")[0]!;
    const editButton = list.getAllByRole("button", { name: "Editar" })[0]!;
    // mismo contenedor (cluster derecho): sin ancho fijo, la fila no se estira
    // más de lo que su propio contenido necesita.
    expect(audience.closest("span.shrink-0")).toBe(editButton.closest("span.shrink-0"));
    expect(listEl.querySelector('[class*="min-w-["]')).toBeNull();
  });

  it("la fecha se muestra relativa y conserva el ISO en el elemento de tiempo", () => {
    const { container } = renderWithQuery(<DiaryActivityList initial={initial} />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-01-01T00:00:00.000Z");
    expect(time?.textContent).not.toBe("2026-01-01T00:00:00.000Z");
  });

  it("3 o más escuchas sin nota consecutivas nunca se agrupan: cada una es su propia fila editable", () => {
    const run = [plainListen("l1", "Uno"), plainListen("l2", "Dos"), plainListen("l3", "Tres")];
    const { container } = renderWithQuery(
      <DiaryActivityList initial={{ entries: run, page: 1, pageSize: 20, hasNext: false }} />,
    );

    expect(container.querySelectorAll("ul > li")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Uno" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tres" })).toBeInTheDocument();
    // cada fila tiene sus propias acciones de editar/borrar
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Eliminar" })).toHaveLength(3);
  });

  it("edita una entrada con el formulario y guarda los cambios", async () => {
    const user = userEvent.setup();
    mocks.updateListenEntry.mockResolvedValue({ ...liked, reaction: "loved" });
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstEdit = screen.getAllByRole("button", { name: "Editar" })[0];
    expect(firstEdit).toBeDefined();
    await user.click(firstEdit!);
    expect(screen.getByLabelText(/Impresión/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(mocks.updateListenEntry).toHaveBeenCalled());
  });

  it("al guardar, cierra el formulario solo y confirma con un destello visual + anuncio accesible", async () => {
    const user = userEvent.setup();
    mocks.updateListenEntry.mockResolvedValue({ ...liked, reaction: "loved" });
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]!);
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    // el formulario se cierra sin acción manual del usuario
    await waitFor(() => expect(screen.queryByLabelText(/Impresión/)).not.toBeInTheDocument());
    // destello ámbar en la fila afectada
    expect(firstRow.className).toMatch(/bg-amber\/10/);
    // el aviso es solo para lectores de pantalla (`sr-only`), no texto visible
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Cambios guardados");
    expect(status.className).toMatch(/sr-only/);
  });

  it("borra una entrada propia tras confirmar", async () => {
    const user = userEvent.setup();
    mocks.deleteListenEntry.mockResolvedValue(null);
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await user.click(within(firstRow).getByRole("button", { name: "Eliminar" }));
    await user.click(within(firstRow).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() => expect(mocks.deleteListenEntry).toHaveBeenCalledWith(liked.id));
    expect(screen.queryByText("Pink Floyd")).not.toBeInTheDocument();
  });

  it("el aviso de confirmar borrado vive en su propia línea, no en el cluster angosto de fecha/acciones", async () => {
    const user = userEvent.setup();
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await user.click(within(firstRow).getByRole("button", { name: "Eliminar" }));

    const warning = within(firstRow).getByRole("alert");
    const dateCluster = within(firstRow).getByText("Seguidores").closest("span.shrink-0");
    // el aviso ya no es hijo del cluster shrink-0 (fecha/editar) — por eso no
    // se sale del ancho de la fila cuando el texto es largo.
    expect(dateCluster?.contains(warning)).toBe(false);
    expect(warning.closest("div")?.className).toMatch(/flex-wrap/);
  });

  it("carga más páginas al pulsar el botón", async () => {
    const user = userEvent.setup();
    mocks.getMyDiary.mockResolvedValue({ entries: [neutral], page: 2, pageSize: 20, hasNext: false });
    renderWithQuery(<DiaryActivityList initial={initial} />);

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() => expect(mocks.getMyDiary).toHaveBeenCalledWith(2, 20, NO_FILTERS));
    expect(screen.getAllByText("Kid A")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });

  it("muestra textos de estado vacío personalizados con prop empty", () => {
    renderWithQuery(
      <DiaryActivityList
        initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }}
        empty={{ title: "Sin datos", description: "No hay nada aquí." }}
      />,
    );
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
    expect(screen.getByText("No hay nada aquí.")).toBeInTheDocument();
  });

  describe("filtros y búsqueda", () => {
    it("buscar texto dispara una nueva query con `q`, tras el debounce", async () => {
      const user = userEvent.setup();
      mocks.getMyDiary.mockResolvedValue({ entries: [neutral], page: 1, pageSize: 20, hasNext: false });
      renderWithQuery(<DiaryActivityList initial={initial} />);

      await user.type(screen.getByPlaceholderText("Buscar por artista, álbum o canción"), "radiohead");

      await waitFor(
        () =>
          expect(mocks.getMyDiary).toHaveBeenCalledWith(1, 20, {
            q: "radiohead",
            context: undefined,
            reaction: undefined,
            audience: undefined,
          }),
        { timeout: 1000 },
      );
    });

    it("cambiar el select de contexto filtra por ese contexto", async () => {
      const user = userEvent.setup();
      mocks.getMyDiary.mockResolvedValue({ entries: [neutral], page: 1, pageSize: 20, hasNext: false });
      renderWithQuery(<DiaryActivityList initial={initial} />);

      await user.selectOptions(screen.getByLabelText("Contexto"), "rediscovery");

      await waitFor(() =>
        expect(mocks.getMyDiary).toHaveBeenCalledWith(1, 20, {
          q: undefined,
          context: "rediscovery",
          reaction: undefined,
          audience: undefined,
        }),
      );
    });

    it("combina el filtro de reacción con el de audiencia", async () => {
      const user = userEvent.setup();
      mocks.getMyDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
      renderWithQuery(<DiaryActivityList initial={initial} />);

      await user.selectOptions(screen.getByLabelText("¿Cómo te sentó?"), "none");
      await user.selectOptions(screen.getByLabelText("Audiencia"), "private");

      await waitFor(() =>
        expect(mocks.getMyDiary).toHaveBeenLastCalledWith(1, 20, {
          q: undefined,
          context: undefined,
          reaction: "none",
          audience: "private",
        }),
      );
    });

    it("sin resultados para los filtros muestra un vacío distinto del diario realmente vacío", async () => {
      const user = userEvent.setup();
      mocks.getMyDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
      renderWithQuery(<DiaryActivityList initial={initial} />);

      await user.selectOptions(screen.getByLabelText("Audiencia"), "private");

      await waitFor(() => expect(screen.getByText("Sin resultados para estos filtros")).toBeInTheDocument());
      expect(screen.queryByText("Todavía no escuchaste nada")).not.toBeInTheDocument();
    });

    it("limpiar filtros vuelve a traer todo", async () => {
      const user = userEvent.setup();
      mocks.getMyDiary.mockResolvedValue({ entries: [], page: 1, pageSize: 20, hasNext: false });
      renderWithQuery(<DiaryActivityList initial={initial} />);

      await user.selectOptions(screen.getByLabelText("Audiencia"), "private");
      await waitFor(() => expect(screen.getByText("Limpiar filtros")).toBeInTheDocument());

      await user.click(screen.getByText("Limpiar filtros"));

      expect(screen.getByText("Pink Floyd")).toBeInTheDocument();
      expect(screen.queryByText("Limpiar filtros")).not.toBeInTheDocument();
    });
  });
});
