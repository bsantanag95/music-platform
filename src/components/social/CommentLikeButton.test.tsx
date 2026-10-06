import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CommentLikeButton } from "./CommentLikeButton";

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
  return { likeComment: vi.fn(), unlikeComment: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));
vi.mock("@/lib/api/social", () => ({ likeComment: mocks.likeComment, unlikeComment: mocks.unlikeComment }));

describe("CommentLikeButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marca el like al instante y toma la cifra de la respuesta", async () => {
    let resolve!: (value: { liked: boolean; likeCount: number | null }) => void;
    mocks.likeComment.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithIntl(<CommentLikeButton commentId="c1" initialLiked={false} initialCount={null} interactive />);

    await userEvent.click(screen.getByRole("button", { name: "Me gusta este comentario" }));
    expect(screen.getByRole("button", { name: "Quitar mi me gusta" })).toHaveAttribute("aria-pressed", "true");

    resolve({ liked: true, likeCount: 3 });
    await waitFor(() => expect(screen.getByLabelText("3 me gusta")).toBeInTheDocument());
  });

  it("revierte y muestra el error si el servidor falla", async () => {
    mocks.likeComment.mockRejectedValue(new mocks.ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    renderWithIntl(<CommentLikeButton commentId="c1" initialLiked={false} initialCount={null} interactive />);

    await userEvent.click(screen.getByRole("button", { name: "Me gusta este comentario" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Me gusta este comentario" })).toHaveAttribute("aria-pressed", "false");
  });

  it("quita el like cuando ya estaba dado", async () => {
    mocks.unlikeComment.mockResolvedValue({ liked: false, likeCount: null });
    renderWithIntl(<CommentLikeButton commentId="c1" initialLiked initialCount={3} interactive />);

    await userEvent.click(screen.getByRole("button", { name: "Quitar mi me gusta" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Me gusta este comentario" })).toBeInTheDocument());
    expect(mocks.unlikeComment).toHaveBeenCalledWith("c1");
  });

  it("anónimo o autor: ve la cifra sin botón", () => {
    renderWithIntl(<CommentLikeButton commentId="c1" initialLiked={false} initialCount={5} interactive={false} />);
    expect(screen.getByLabelText("5 me gusta")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sin botón y bajo el umbral no renderiza nada", () => {
    const { container } = renderWithIntl(<CommentLikeButton commentId="c1" initialLiked={false} initialCount={null} interactive={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
