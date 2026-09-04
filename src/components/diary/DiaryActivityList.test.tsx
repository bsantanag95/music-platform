import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
vi.mock("@/lib/api/diary", () => ({
  updateListenEntry: mocks.updateListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
  getMyDiary: mocks.getMyDiary,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

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
  target: { type: "release-group", id: "a1b2c3d4-0000-4000-8000-000000000004", title: "Kid A", subtitle: null, coverThumbUrl: null },
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
    renderWithIntl(<DiaryActivityList initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }} />);
    expect(screen.getByText("Todavía no escuchaste nada")).toBeInTheDocument();
  });

  it("lista las entradas con objetivo, contexto, reacción y sin celda de carátula", () => {
    renderWithIntl(<DiaryActivityList initial={initial} />);
    expect(screen.getByText("Pink Floyd")).toBeInTheDocument();
    expect(screen.getByText(/Primera escucha/)).toBeInTheDocument();
    expect(screen.getByText("Me gustó")).toBeInTheDocument();
    expect(screen.getByText("Neutro")).toBeInTheDocument();
    expect(screen.getByText("Kid A")).toBeInTheDocument();
    expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
  });

  it("una entrada con impresión la muestra sobre un panel; sin impresión, en una línea", () => {
    const { container } = renderWithIntl(<DiaryActivityList initial={initial} />);
    expect(screen.getByText("El bajo está ridículamente bueno")).toBeInTheDocument();
    expect(container.querySelectorAll("p.bg-ink-surface")).toHaveLength(1);
  });

  it("la fecha se muestra relativa y conserva el ISO en el elemento de tiempo", () => {
    const { container } = renderWithIntl(<DiaryActivityList initial={initial} />);
    const time = container.querySelector("time");
    expect(time).toHaveAttribute("dateTime", "2026-01-01T00:00:00.000Z");
    expect(time?.textContent).not.toBe("2026-01-01T00:00:00.000Z");
  });

  it("3 o más escuchas sin nota consecutivas nunca se agrupan: cada una es su propia fila editable", () => {
    const run = [plainListen("l1", "Uno"), plainListen("l2", "Dos"), plainListen("l3", "Tres")];
    const { container } = renderWithIntl(
      <DiaryActivityList initial={{ entries: run, page: 1, pageSize: 20, hasNext: false }} />,
    );

    expect(container.querySelectorAll("li")).toHaveLength(3);
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
    renderWithIntl(<DiaryActivityList initial={initial} />);

    const firstEdit = screen.getAllByRole("button", { name: "Editar" })[0];
    expect(firstEdit).toBeDefined();
    await user.click(firstEdit!);
    expect(screen.getByLabelText(/Impresión/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(mocks.updateListenEntry).toHaveBeenCalled());
  });

  it("borra una entrada propia tras confirmar", async () => {
    const user = userEvent.setup();
    mocks.deleteListenEntry.mockResolvedValue(null);
    renderWithIntl(<DiaryActivityList initial={initial} />);

    const firstRow = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await user.click(within(firstRow).getByRole("button", { name: "Eliminar" }));
    await user.click(within(firstRow).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() => expect(mocks.deleteListenEntry).toHaveBeenCalledWith(liked.id));
    expect(screen.queryByText("Pink Floyd")).not.toBeInTheDocument();
  });

  it("carga más páginas al pulsar el botón", async () => {
    const user = userEvent.setup();
    mocks.getMyDiary.mockResolvedValue({ entries: [neutral], page: 2, pageSize: 20, hasNext: false });
    renderWithIntl(<DiaryActivityList initial={initial} />);

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() => expect(mocks.getMyDiary).toHaveBeenCalledWith(2, 20));
    expect(screen.getAllByText("Kid A")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });

  it("loadMore personalizado reemplaza getMyDiary", async () => {
    const user = userEvent.setup();
    const customLoadMore = vi.fn().mockResolvedValue({ entries: [neutral], page: 2, pageSize: 20, hasNext: false });
    renderWithIntl(<DiaryActivityList initial={initial} loadMore={customLoadMore} />);

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() => expect(customLoadMore).toHaveBeenCalledWith(2, 20));
    expect(mocks.getMyDiary).not.toHaveBeenCalled();
  });

  it("muestra textos de estado vacío personalizados con prop empty", () => {
    renderWithIntl(
      <DiaryActivityList
        initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }}
        empty={{ title: "Sin datos", description: "No hay nada aquí." }}
      />,
    );
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
    expect(screen.getByText("No hay nada aquí.")).toBeInTheDocument();
  });
});
