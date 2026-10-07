import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CommentThread } from "./CommentThread";
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
  return { getReplies: vi.fn(), createReply: vi.fn(), updateComment: vi.fn(), deleteComment: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));
vi.mock("@/lib/api/social", () => ({
  getReplies: mocks.getReplies,
  createReply: mocks.createReply,
  updateComment: mocks.updateComment,
  deleteComment: mocks.deleteComment,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/components/profiles/UserHoverCard", () => ({ UserHoverCard: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("./ContentActions", () => ({ ContentActions: () => null }));
vi.mock("./CommentLikeButton", () => ({ CommentLikeButton: () => null }));

const ROOT = "00000000-0000-4000-8000-000000000010";

const reply = (id: string, body = `respuesta ${id}`, authorId = `u-${id}`) => ({
  id,
  user: { id: authorId, username: `ana${id}`, displayName: null },
  body,
  topic: "start" as const,
  parentId: ROOT,
  replyCount: 0,
  createdAt: "2026-10-01T00:00:00.000Z",
  likeCount: null,
  likedByMe: false,
});

const page = (comments: ReturnType<typeof reply>[], hasNext = false, pageNumber = 1): CommentsResponse => ({ comments, page: pageNumber, pageSize: 20, hasNext });

describe("CommentThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin respuestas y sin sesión no muestra nada", () => {
    const { container } = renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={0} authenticated={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("sin respuestas y con sesión ofrece Responder, sin pedir el hilo", async () => {
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={0} authenticated userId="me" />);

    await userEvent.click(screen.getByRole("button", { name: "Responder" }));

    expect(mocks.getReplies).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tu respuesta")).toBeInTheDocument();
  });

  it("muestra el conteo y, al desplegar, carga las respuestas en orden", async () => {
    mocks.getReplies.mockResolvedValue(page([reply("1"), reply("2")]));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={2} authenticated={false} />);

    const toggle = screen.getByRole("button", { name: "Ver 2 respuestas" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);

    await waitFor(() => expect(screen.getByText("respuesta 1")).toBeInTheDocument());
    expect(mocks.getReplies).toHaveBeenCalledWith(ROOT, 1);
    expect(screen.getAllByText(/^respuesta \d$/).map((node) => node.textContent)).toEqual(["respuesta 1", "respuesta 2"]);
    expect(screen.getByRole("button", { name: "Ocultar respuestas" })).toHaveAttribute("aria-expanded", "true");
    // Sin sesión: invita a iniciar sesión en vez de mostrar el formulario.
    expect(screen.getByText("Inicia sesión para responder")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tu respuesta")).not.toBeInTheDocument();
  });

  it("usa el singular con una sola respuesta", () => {
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={1} authenticated={false} />);
    expect(screen.getByRole("button", { name: "Ver 1 respuesta" })).toBeInTheDocument();
  });

  it("no vuelve a pedir el hilo al cerrarlo y abrirlo", async () => {
    mocks.getReplies.mockResolvedValue(page([reply("1")]));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={1} authenticated={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));
    await screen.findByText("respuesta 1");
    await userEvent.click(screen.getByRole("button", { name: "Ocultar respuestas" }));
    await userEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));

    expect(mocks.getReplies).toHaveBeenCalledTimes(1);
  });

  it("publica una respuesta al final del hilo y sube el conteo", async () => {
    mocks.getReplies.mockResolvedValue(page([reply("1")]));
    mocks.createReply.mockResolvedValue(reply("9", "estoy de acuerdo", "me"));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={1} authenticated userId="me" />);

    await userEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));
    await screen.findByText("respuesta 1");
    await userEvent.type(screen.getByLabelText("Tu respuesta"), "estoy de acuerdo");
    await userEvent.click(screen.getByRole("button", { name: "Publicar respuesta" }));

    await waitFor(() => expect(mocks.createReply).toHaveBeenCalledWith(ROOT, "estoy de acuerdo"));
    expect(await screen.findByText("estoy de acuerdo")).toBeInTheDocument();
    // Cerrado, el botón refleja el conteo nuevo.
    await userEvent.click(screen.getByRole("button", { name: "Ocultar respuestas" }));
    expect(screen.getByRole("button", { name: "Ver 2 respuestas" })).toBeInTheDocument();
  });

  it("el botón de publicar queda deshabilitado con el texto vacío", async () => {
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={0} authenticated userId="me" />);
    await userEvent.click(screen.getByRole("button", { name: "Responder" }));
    expect(screen.getByRole("button", { name: "Publicar respuesta" })).toBeDisabled();
  });

  it("cargar más pide la página siguiente del hilo", async () => {
    mocks.getReplies
      .mockResolvedValueOnce(page([reply("1")], true))
      .mockResolvedValueOnce(page([reply("2")], false, 2));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={2} authenticated={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Ver 2 respuestas" }));
    await userEvent.click(await screen.findByRole("button", { name: "Cargar más respuestas" }));

    await waitFor(() => expect(mocks.getReplies).toHaveBeenLastCalledWith(ROOT, 2));
    expect(await screen.findByText("respuesta 2")).toBeInTheDocument();
  });

  it("la autora puede borrar su respuesta", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.getReplies.mockResolvedValue(page([reply("1", "mi respuesta", "me")]));
    mocks.deleteComment.mockResolvedValue(null);
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={1} authenticated userId="me" />);

    await userEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));
    await screen.findByText("mi respuesta");
    await userEvent.click(screen.getByRole("button", { name: "Borrar" }));

    await waitFor(() => expect(mocks.deleteComment).toHaveBeenCalledWith("1"));
    expect(screen.queryByText("mi respuesta")).not.toBeInTheDocument();
  });

  it("la autora puede editar el texto de su respuesta", async () => {
    mocks.getReplies.mockResolvedValue(page([reply("1", "mi respuesta", "me")]));
    mocks.updateComment.mockResolvedValue(reply("1", "texto corregido", "me"));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={1} authenticated userId="me" />);

    await userEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));
    await screen.findByText("mi respuesta");
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    const editor = screen.getByLabelText("Editar comentario");
    await userEvent.clear(editor);
    await userEvent.type(editor, "texto corregido");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.updateComment).toHaveBeenCalledWith("1", "texto corregido"));
    expect(await screen.findByText("texto corregido")).toBeInTheDocument();
  });

  it("no ofrece editar ni borrar respuestas ajenas", async () => {
    mocks.getReplies.mockResolvedValue(page([reply("1", "ajena", "otra")]));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={1} authenticated userId="me" />);

    await userEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));
    await screen.findByText("ajena");

    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar" })).not.toBeInTheDocument();
  });

  it("un error al cargar el hilo se muestra como alerta", async () => {
    mocks.getReplies.mockRejectedValue(new mocks.ApiError("COMMENT_NOT_FOUND", 404, "x"));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={1} authenticated userId="me" />);
    await userEvent.click(screen.getByRole("button", { name: "Ver 1 respuesta" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("un error REPLIES_NOT_ALLOWED al publicar se muestra con su texto", async () => {
    mocks.createReply.mockRejectedValue(new mocks.ApiError("REPLIES_NOT_ALLOWED", 400, "x"));
    renderWithIntl(<CommentThread rootId={ROOT} initialReplyCount={0} authenticated userId="me" />);

    await userEvent.click(screen.getByRole("button", { name: "Responder" }));
    await userEvent.type(screen.getByLabelText("Tu respuesta"), "hola");
    await userEvent.click(screen.getByRole("button", { name: "Publicar respuesta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Este comentario no admite respuestas.");
  });
});
