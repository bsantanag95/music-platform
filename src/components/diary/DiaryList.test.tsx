import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { DiaryList } from "./DiaryList";
import type { DiaryListResponse } from "@/lib/api/schemas";

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
    createListenEntry: vi.fn(),
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
  createListenEntry: mocks.createListenEntry,
  updateListenEntry: mocks.updateListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
  getMyDiary: mocks.getMyDiary,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

const liked = {
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  listenContext: "first_listen" as const,
  body: "El bajo está ridículamente bueno",
  reaction: "liked" as const,
  audience: "followers" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  target: { type: "artist" as const, id: "a1b2c3d4-0000-4000-8000-000000000002", title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};
const neutral = {
  id: "a1b2c3d4-0000-4000-8000-000000000003",
  listenContext: "relisten" as const,
  body: null,
  reaction: "neutral" as const,
  audience: "public" as const,
  createdAt: "2026-01-02T00:00:00.000Z",
  target: { type: "release-group" as const, id: "a1b2c3d4-0000-4000-8000-000000000004", title: "Kid A", subtitle: null, coverThumbUrl: null },
};

const initial: DiaryListResponse = { entries: [liked, neutral], page: 1, pageSize: 20, hasNext: true };

describe("DiaryList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el estado vacío cuando no hay escuchas", () => {
    renderWithIntl(<DiaryList initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }} />);
    expect(screen.getByText("Todavía no escuchaste nada")).toBeInTheDocument();
  });

  it("lista las entradas con objetivo, contexto, impresión y reacción", () => {
    renderWithIntl(<DiaryList initial={initial} />);
    expect(screen.getByText("Pink Floyd")).toBeInTheDocument();
    expect(screen.getByText("El bajo está ridículamente bueno")).toBeInTheDocument();
    expect(screen.getByText("Primera escucha")).toBeInTheDocument();
    expect(screen.getByText("Me gustó")).toBeInTheDocument();
    expect(screen.getByText("Neutro")).toBeInTheDocument();
    expect(screen.getByText("Kid A")).toBeInTheDocument();
  });

  it("distingue la reacción neutral de la ausencia de dato", () => {
    renderWithIntl(<DiaryList initial={initial} />);
    expect(screen.getByText("Neutro")).toBeInTheDocument();
    expect(screen.queryByText("Sin reacción")).not.toBeInTheDocument();
  });

  it("amplía una entrada con el formulario y guarda los cambios", async () => {
    const user = userEvent.setup();
    mocks.updateListenEntry.mockResolvedValue({ ...liked, reaction: "loved" });
    renderWithIntl(<DiaryList initial={initial} />);

    const firstExpand = screen.getAllByRole("button", { name: "Ampliar" })[0];
    expect(firstExpand).toBeDefined();
    await user.click(firstExpand!);
    expect(screen.getByLabelText(/Impresión/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(mocks.updateListenEntry).toHaveBeenCalled());
  });

  it("borra una entrada propia tras confirmar", async () => {
    const user = userEvent.setup();
    mocks.deleteListenEntry.mockResolvedValue(null);
    renderWithIntl(<DiaryList initial={initial} />);

    const firstCard = screen.getByText("Pink Floyd").closest("li") as HTMLElement;
    await user.click(within(firstCard).getByRole("button", { name: "Eliminar" }));
    await user.click(within(firstCard).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() => expect(mocks.deleteListenEntry).toHaveBeenCalledWith(liked.id));
    expect(screen.queryByText("Pink Floyd")).not.toBeInTheDocument();
  });

  it("carga más páginas al pulsar el botón", async () => {
    const user = userEvent.setup();
    mocks.getMyDiary.mockResolvedValue({ entries: [neutral], page: 2, pageSize: 20, hasNext: false });
    renderWithIntl(<DiaryList initial={initial} />);

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() => expect(mocks.getMyDiary).toHaveBeenCalledWith(2, 20));
    expect(screen.getAllByText("Kid A")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });

  it("modo readOnly oculta controles de edición y audiencia", () => {
    renderWithIntl(<DiaryList initial={initial} readOnly />);
    expect(screen.queryByRole("button", { name: "Ampliar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
    expect(screen.queryByText("Seguidores")).not.toBeInTheDocument();
    expect(screen.queryByText("Público")).not.toBeInTheDocument();
  });

  it("modo readOnly muestra contexto, reacción y cuerpo", () => {
    renderWithIntl(<DiaryList initial={initial} readOnly />);
    expect(screen.getByText("Primera escucha")).toBeInTheDocument();
    expect(screen.getByText("Me gustó")).toBeInTheDocument();
    expect(screen.getByText("El bajo está ridículamente bueno")).toBeInTheDocument();
  });

  it("showAuthor muestra el autor con enlace al perfil", () => {
    const withAuthor = {
      ...liked,
      author: { id: "u1", username: "seguido", displayName: "Seguido" },
    };
    renderWithIntl(
      <DiaryList
        initial={{ entries: [withAuthor], page: 1, pageSize: 20, hasNext: false }}
        readOnly
        showAuthor
      />,
    );
    expect(screen.getByText("Seguido")).toBeInTheDocument();
    const link = screen.getByText("Seguido").closest("a") as HTMLAnchorElement;
    expect(link.href).toContain("/users/seguido");
  });

  it("muestra textos de estado vacío personalizados con prop empty", () => {
    renderWithIntl(
      <DiaryList
        initial={{ entries: [], page: 1, pageSize: 20, hasNext: false }}
        empty={{ title: "Sin datos", description: "No hay nada aquí." }}
      />,
    );
    expect(screen.getByText("Sin datos")).toBeInTheDocument();
    expect(screen.getByText("No hay nada aquí.")).toBeInTheDocument();
  });

  it("loadMore personalizado reemplaza getMyDiary", async () => {
    const user = userEvent.setup();
    const customLoadMore = vi.fn().mockResolvedValue({ entries: [neutral], page: 2, pageSize: 20, hasNext: false });
    renderWithIntl(
      <DiaryList initial={initial} loadMore={customLoadMore} readOnly />,
    );

    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    await waitFor(() => expect(customLoadMore).toHaveBeenCalledWith(2, 20));
    expect(mocks.getMyDiary).not.toHaveBeenCalled();
  });
});