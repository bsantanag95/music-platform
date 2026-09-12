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
    createListenEntry: vi.fn(),
    getMyLists: vi.fn(),
    addItemToList: vi.fn(),
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
  createListenEntry: mocks.createListenEntry,
}));
vi.mock("@/lib/api/lists", () => ({
  getMyLists: mocks.getMyLists,
  addItemToList: mocks.addItemToList,
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
  createdAt: "2026-01-15T12:00:00.000Z",
  target: { type: "artist", id: "a1b2c3d4-0000-4000-8000-000000000002", title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};
const neutral: ListenEntry = {
  id: "a1b2c3d4-0000-4000-8000-000000000003",
  listenContext: "relisten",
  body: null,
  reaction: "neutral",
  audience: "public",
  createdAt: "2026-01-20T12:00:00.000Z",
  target: { type: "release-group", id: "a1b2c3d4-0000-4000-8000-000000000004", title: "Kid A", subtitle: null, coverThumbUrl: "https://cover/kid-a.jpg" },
};

function plainListen(id: string, title: string, createdAt = "2026-01-25T12:00:00.000Z"): ListenEntry {
  return {
    id,
    listenContext: "relisten",
    body: null,
    reaction: null,
    audience: "public",
    createdAt,
    target: { type: "recording", id: `target-${id}`, title, subtitle: null, coverThumbUrl: null },
  };
}

const albumWithCreditedArtist: ListenEntry = {
  id: "a1b2c3d4-0000-4000-8000-000000000005",
  listenContext: "first_listen",
  body: null,
  reaction: null,
  audience: "public",
  createdAt: "2026-01-22T12:00:00.000Z",
  target: {
    type: "release-group",
    id: "a1b2c3d4-0000-4000-8000-000000000006",
    title: "In Rainbows",
    subtitle: "Radiohead",
    artistId: "a1b2c3d4-0000-4000-8000-000000000007",
    coverThumbUrl: null,
  },
};

const initial: DiaryListResponse = { entries: [liked, neutral], page: 1, pageSize: 20, hasNext: true };

async function openRowMenu(user: ReturnType<typeof userEvent.setup>, row: HTMLElement) {
  await user.click(within(row).getByRole("button", { name: "Más acciones" }));
}

describe("DiaryActivityList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay escuchas", () => {
    renderWithQuery(<DiaryActivityList initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }} />);
    expect(screen.getByText("Todavía no registraste nada")).toBeInTheDocument();
  });

  it("agrupa las entradas por mes con un encabezado, sin conmutador de vista", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    expect(screen.getByRole("heading", { name: /enero de 2026/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lista" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cronología" })).not.toBeInTheDocument();
    const list = within(screen.getByRole("list"));
    expect(list.getByText("Pink Floyd")).toBeInTheDocument();
    expect(list.getByText(/Primera escucha/)).toBeInTheDocument();
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

  it("un álbum o canción con artista acreditado enlaza el nombre del artista a su página, como en el feed", () => {
    renderWithQuery(
      <DiaryActivityList initial={{ entries: [albumWithCreditedArtist], page: 1, pageSize: 20, hasNext: false }} />,
    );
    const artistLink = screen.getByRole("link", { name: "Radiohead" });
    expect(artistLink).toHaveAttribute("href", "/artist/a1b2c3d4-0000-4000-8000-000000000007");
  });

  it("sin artista acreditado, el nombre del artista se muestra como texto plano", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    // "Kid A" (release-group) no trae artistId en este fixture — sin subtitle
    // tampoco hay nombre de artista que mostrar, así que no hay ningún enlace
    // de artista en la fila
    const kidARow = screen.getByText("Kid A").closest("li") as HTMLElement;
    expect(within(kidARow).queryAllByRole("link")).toHaveLength(1); // solo el título
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

  it("la reacción se muestra como ícono en el cluster de acciones, junto a audiencia, con el nombre accesible", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    const likedRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    const glyph = within(likedRow).getByRole("img", { name: "Me gustó" });
    expect(glyph).toBeInTheDocument();
    // vive en el mismo cluster que audiencia/editar/menú, no junto al título
    const actionsCluster = within(likedRow).getByText("Seguidores").closest("span.shrink-0");
    expect(actionsCluster?.contains(glyph)).toBe(true);
  });

  it("sin reacción, el slot se reserva igual — no desaparece, solo queda vacío y decorativo", () => {
    const withReaction = { ...liked, id: "r1" };
    const withoutReaction = plainListen("l1", "Sin reacción");
    const { container } = renderWithQuery(
      <DiaryActivityList initial={{ entries: [withReaction, withoutReaction], page: 1, pageSize: 20, hasNext: false }} />,
    );

    // un slot de ancho fijo por fila, exista o no la reacción
    const slots = container.querySelectorAll('span[class*="w-5"][class*="shrink-0"]');
    expect(slots).toHaveLength(2);

    const rowWithout = screen.getByRole("link", { name: "Sin reacción" }).closest("li") as HTMLElement;
    expect(within(rowWithout).queryByRole("img")).toBeNull();
    const emptySlot = rowWithout.querySelector('span[class*="w-5"][class*="shrink-0"]');
    expect(emptySlot).not.toBeNull();
    expect(emptySlot).toHaveAttribute("aria-hidden", "true");
    expect(emptySlot?.textContent).toBe("");
  });

  it("editar es un ícono siempre visible con nombre accesible 'Editar'", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(2);
  });

  it("el resto de acciones vive detrás del menú '···', no como enlaces de texto sueltos", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Más acciones" })).toHaveLength(2);
  });

  it("la fecha conserva el ISO y expone fecha absoluta + relativa como valor accesible", () => {
    const { container } = renderWithQuery(<DiaryActivityList initial={initial} />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", liked.createdAt);
    expect(time).toHaveAttribute("aria-label");
    expect(time?.getAttribute("aria-label")).toMatch(/·/);
    expect(time?.getAttribute("title")).not.toBe("");
  });

  it("no repite el día en escuchas consecutivas del mismo día — solo lo muestra en la primera", () => {
    const sameDay = [
      { ...liked, id: "d1", createdAt: "2026-04-08T09:00:00.000Z" },
      { ...neutral, id: "d2", createdAt: "2026-04-08T20:00:00.000Z" },
    ];
    renderWithQuery(<DiaryActivityList initial={{ entries: sameDay, page: 1, pageSize: 20, hasNext: false }} />);
    // el número "8" aparece una sola vez como día visible
    expect(screen.getAllByText("8")).toHaveLength(1);
  });

  it("dos filas de días distintos muestran cada una su propio número de día", () => {
    const differentDays = [
      { ...liked, id: "d1", createdAt: "2026-04-08T09:00:00.000Z" },
      { ...neutral, id: "d2", createdAt: "2026-04-05T09:00:00.000Z" },
    ];
    renderWithQuery(<DiaryActivityList initial={{ entries: differentDays, page: 1, pageSize: 20, hasNext: false }} />);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("nunca muestra el mes dentro de una fila — solo en el encabezado del grupo", () => {
    renderWithQuery(<DiaryActivityList initial={initial} />);
    const list = screen.getByRole("list");
    expect(within(list).queryByText(/ENE/i)).not.toBeInTheDocument();
  });

  it("3 o más escuchas sin nota consecutivas nunca se agrupan: cada una es su propia fila editable", () => {
    const run = [
      plainListen("l1", "Uno", "2026-01-25T09:00:00.000Z"),
      plainListen("l2", "Dos", "2026-01-25T10:00:00.000Z"),
      plainListen("l3", "Tres", "2026-01-25T11:00:00.000Z"),
    ];
    const { container } = renderWithQuery(
      <DiaryActivityList initial={{ entries: run, page: 1, pageSize: 20, hasNext: false }} />,
    );

    expect(container.querySelectorAll("ul > li")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Uno" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tres" })).toBeInTheDocument();
    // cada fila tiene sus propias acciones de editar/menú
    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Más acciones" })).toHaveLength(3);
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

  it("borra una entrada propia tras confirmar desde el menú", async () => {
    const user = userEvent.setup();
    mocks.deleteListenEntry.mockResolvedValue(null);
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await openRowMenu(user, firstRow);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    await user.click(within(firstRow).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() => expect(mocks.deleteListenEntry).toHaveBeenCalledWith(liked.id));
    expect(screen.queryByText("Pink Floyd")).not.toBeInTheDocument();
  });

  it("el aviso de confirmar borrado vive en su propia línea, no en el cluster angosto de fecha/acciones", async () => {
    const user = userEvent.setup();
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await openRowMenu(user, firstRow);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));

    const warning = within(firstRow).getByRole("alert");
    const dateCluster = within(firstRow).getByText("Seguidores").closest("span.shrink-0");
    // el aviso ya no es hijo del cluster shrink-0 (audiencia/editar/menú) — por
    // eso no se sale del ancho de la fila cuando el texto es largo.
    expect(dateCluster?.contains(warning)).toBe(false);
    expect(warning.closest("div")?.className).toMatch(/flex-wrap/);
  });

  it("registrar otra escucha desde el menú crea una entrada y la muestra al frente con el formulario abierto", async () => {
    const user = userEvent.setup();
    const created: ListenEntry = {
      id: "a1b2c3d4-0000-4000-8000-000000000099",
      listenContext: "relisten",
      body: null,
      reaction: null,
      audience: "private",
      createdAt: "2026-01-26T00:00:00.000Z",
      target: liked.target,
    };
    mocks.createListenEntry.mockResolvedValue(created);
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await openRowMenu(user, firstRow);
    await user.click(screen.getByRole("menuitem", { name: "Registrar otra escucha" }));

    await waitFor(() =>
      expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "artist", id: liked.target.id }),
    );
    // dos filas con el mismo objetivo ahora (la nueva + la original)
    await waitFor(() => expect(screen.getAllByText("Pink Floyd")).toHaveLength(2));
    // el formulario de ampliación de la nueva entrada ya está abierto
    expect(screen.getByLabelText(/Impresión/)).toBeInTheDocument();
  });

  it("agregar a lista desde el menú abre el panel de listas para el objetivo de la fila", async () => {
    const user = userEvent.setup();
    mocks.getMyLists.mockResolvedValue({
      lists: [{ id: "list-1", entityType: "artist", title: "Rock clásico" }],
      page: 1,
      pageSize: 50,
      hasNext: false,
    });
    mocks.addItemToList.mockResolvedValue({});
    renderWithQuery(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await openRowMenu(user, firstRow);
    await user.click(screen.getByRole("menuitem", { name: "Agregar a lista" }));

    const listButton = await within(firstRow).findByRole("button", { name: "Rock clásico" });
    await user.click(listButton);

    await waitFor(() =>
      expect(mocks.addItemToList).toHaveBeenCalledWith("list-1", { type: "artist", id: liked.target.id }),
    );
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
      expect(screen.queryByText("Todavía no registraste nada")).not.toBeInTheDocument();
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

  describe("agrupado por mes (deepen-listening-diary / redesign-diary-row)", () => {
    const enero: ListenEntry = { ...liked, id: "m-ene", createdAt: "2026-01-20T00:00:00.000Z" };
    const febA: ListenEntry = {
      ...neutral,
      id: "m-feb-a",
      createdAt: "2026-02-10T00:00:00.000Z",
      target: { ...neutral.target, id: "t-feb-a", title: "Disco Feb A" },
    };
    const febB: ListenEntry = {
      ...neutral,
      id: "m-feb-b",
      createdAt: "2026-02-02T00:00:00.000Z",
      target: { ...neutral.target, id: "t-feb-b", title: "Disco Feb B" },
    };
    const multiMonth: DiaryListResponse = {
      entries: [febA, febB, enero],
      page: 1,
      pageSize: 20,
      hasNext: false,
    };

    it("agrupa las entradas por mes, siempre, sin necesidad de elegir una vista", () => {
      renderWithQuery(<DiaryActivityList initial={multiMonth} />);

      const febHeading = screen.getByRole("heading", { name: /febrero de 2026/i });
      const eneHeading = screen.getByRole("heading", { name: /enero de 2026/i });
      expect(febHeading).toBeInTheDocument();
      expect(eneHeading).toBeInTheDocument();
      // dos listas: una por mes
      expect(screen.getAllByRole("list")).toHaveLength(2);
    });

    it("no muestra conteos ni totales por mes", () => {
      renderWithQuery(<DiaryActivityList initial={multiMonth} />);

      const febHeading = screen.getByRole("heading", { name: /febrero de 2026/i });
      // el encabezado es solo mes + año, sin "(2)" ni "2 escuchas"
      expect(febHeading.textContent).not.toMatch(/\(\d|\d\s*(escuchas?|entradas?)/i);
    });

    it("editar una entrada sigue disponible", async () => {
      const user = userEvent.setup();
      renderWithQuery(<DiaryActivityList initial={multiMonth} />);

      const editButtons = screen.getAllByRole("button", { name: "Editar" });
      await user.click(editButtons[0]!);

      expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    });
  });
});
