import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { Comments } from "./Comments";
import type { CommentsResponse } from "@/lib/api/schemas";

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
  return { getComments: vi.fn(), createComment: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));
vi.mock("@/lib/api/social", () => ({
  getComments: mocks.getComments,
  createComment: mocks.createComment,
  updateComment: mocks.updateComment,
  deleteComment: mocks.deleteComment,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/components/profiles/UserHoverCard", () => ({ UserHoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./ContentActions", () => ({ ContentActions: () => null }));
vi.mock("./CommentLikeButton", () => ({ CommentLikeButton: () => null }));

type Topic = "start" | "albums" | "songs" | "general";

const comment = (id: string, topic: Topic | null, body = `texto ${id}`) => ({
  id,
  user: { id: `u-${id}`, username: `ana${id}`, displayName: null },
  body,
  topic,
  createdAt: "2026-10-01T00:00:00.000Z",
  likeCount: null,
  likedByMe: false,
});

const page = (comments: ReturnType<typeof comment>[], hasNext = false): CommentsResponse => ({ comments, page: 1, pageSize: 20, hasNext });

const artistProps = {
  target: "artist" as const,
  targetId: "00000000-0000-4000-8000-000000000001",
  authenticated: true,
  userId: "me",
};

describe("Comments con temas (artista)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra el título Comentarios, los chips y el tema de cada comentario", () => {
    renderWithIntl(<Comments {...artistProps} topics initial={page([comment("1", "start"), comment("2", "general")])} />);

    expect(screen.getByRole("heading", { name: "Comentarios" })).toBeInTheDocument();
    const chips = within(screen.getByRole("group", { name: "Filtrar comentarios por tema" }));
    for (const name of ["Todos", "Para empezar", "Álbumes", "Canciones", "General"]) {
      expect(chips.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(chips.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
    // El tema aparece también en cada comentario.
    expect(screen.getAllByText("Para empezar").length).toBeGreaterThan(1);
  });

  it("el formulario arranca en General y el selector ofrece los cuatro temas", () => {
    renderWithIntl(<Comments {...artistProps} topics initial={page([])} />);

    const select = screen.getByLabelText("Tema");
    expect(select).toHaveValue("general");
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["Para empezar", "Álbumes", "Canciones", "General"]);
  });

  it("al activar un chip pide ese tema, reemplaza la lista y preselecciona el tema al escribir", async () => {
    mocks.getComments.mockResolvedValue(page([comment("9", "start", "empezá por el primero")]));
    renderWithIntl(<Comments {...artistProps} topics initial={page([comment("1", "general")])} />);

    await userEvent.click(screen.getByRole("button", { name: "Para empezar" }));

    await waitFor(() => expect(screen.getByText("empezá por el primero")).toBeInTheDocument());
    expect(mocks.getComments).toHaveBeenCalledWith("artist", artistProps.targetId, 1, 20, "start");
    expect(screen.queryByText("texto 1")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Para empezar", pressed: true })).toBeInTheDocument();
    expect(screen.getByLabelText("Tema")).toHaveValue("start");
  });

  it("un tema sin comentarios muestra su propio estado vacío", async () => {
    mocks.getComments.mockResolvedValue(page([]));
    renderWithIntl(<Comments {...artistProps} topics initial={page([comment("1", "general")])} />);

    await userEvent.click(screen.getByRole("button", { name: "Canciones" }));

    expect(await screen.findByText("Todavía no hay comentarios sobre sus canciones.")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay comentarios.")).not.toBeInTheDocument();
  });

  it("publica con el tema elegido y lo agrega a la lista", async () => {
    mocks.createComment.mockResolvedValue(comment("5", "albums", "su mejor disco"));
    renderWithIntl(<Comments {...artistProps} topics initial={page([])} />);

    await userEvent.selectOptions(screen.getByLabelText("Tema"), "albums");
    await userEvent.type(screen.getByLabelText("Comentario"), "su mejor disco");
    await userEvent.click(screen.getByRole("button", { name: "Publicar comentario" }));

    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledWith("artist", artistProps.targetId, "su mejor disco", "albums"));
    expect(await screen.findByText("su mejor disco")).toBeInTheDocument();
  });

  it("si el comentario cae en otro tema que el filtro activo, pasa a ese tema", async () => {
    mocks.getComments
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(page([comment("5", "songs", "su mejor tema")]));
    mocks.createComment.mockResolvedValue(comment("5", "songs", "su mejor tema"));
    renderWithIntl(<Comments {...artistProps} topics initial={page([])} />);

    await userEvent.click(screen.getByRole("button", { name: "Álbumes" }));
    await userEvent.selectOptions(screen.getByLabelText("Tema"), "songs");
    await userEvent.type(screen.getByLabelText("Comentario"), "su mejor tema");
    await userEvent.click(screen.getByRole("button", { name: "Publicar comentario" }));

    await waitFor(() => expect(mocks.getComments).toHaveBeenLastCalledWith("artist", artistProps.targetId, 1, 20, "songs"));
    expect(await screen.findByRole("button", { name: "Canciones", pressed: true })).toBeInTheDocument();
  });

  it("cargar más conserva el filtro activo", async () => {
    mocks.getComments
      .mockResolvedValueOnce({ ...page([comment("1", "start")], true), page: 1 })
      .mockResolvedValueOnce({ ...page([comment("2", "start")]), page: 2 });
    renderWithIntl(<Comments {...artistProps} topics initial={page([])} />);

    await userEvent.click(screen.getByRole("button", { name: "Para empezar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cargar más comentarios" }));

    await waitFor(() => expect(mocks.getComments).toHaveBeenLastCalledWith("artist", artistProps.targetId, 2, 20, "start"));
  });

  it("un error al filtrar muestra el mensaje del código", async () => {
    mocks.getComments.mockRejectedValue(new mocks.ApiError("INVALID_TOPIC", 400, "x"));
    renderWithIntl(<Comments {...artistProps} topics initial={page([])} />);

    await userEvent.click(screen.getByRole("button", { name: "Álbumes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Elige un tema válido para el comentario.");
  });
});

describe("Comments sin temas (álbum y canción)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no muestra chips, selector ni etiqueta de tema", () => {
    renderWithIntl(<Comments target="release-group" targetId="rg" authenticated userId="me" initial={page([comment("1", null)])} />);

    expect(screen.getByRole("heading", { name: "Comentarios" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtrar comentarios por tema" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Tema")).not.toBeInTheDocument();
    expect(screen.queryByText("General")).not.toBeInTheDocument();
  });

  it("publica sin tema", async () => {
    mocks.createComment.mockResolvedValue(comment("2", null, "buen disco"));
    renderWithIntl(<Comments target="release-group" targetId="rg" authenticated userId="me" initial={page([])} />);

    await userEvent.type(screen.getByLabelText("Comentario"), "buen disco");
    await userEvent.click(screen.getByRole("button", { name: "Publicar comentario" }));

    await waitFor(() => expect(mocks.createComment).toHaveBeenCalledWith("release-group", "rg", "buen disco", undefined));
  });
});
