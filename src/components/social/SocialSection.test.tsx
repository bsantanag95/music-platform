import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ApiError } from "@/lib/api/errors";
import { SocialSection } from "./SocialSection";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

const socialMocks = vi.hoisted(() => ({
  saveRating: vi.fn(),
  deleteRating: vi.fn(),
  getRatings: vi.fn(),
  getComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock("@/lib/api/social", () => socialMocks);

const ratings = {
  own: null,
  aggregate: { count: 1, averageStars: 4, averageDetailedScore: 80 },
};
const comments = {
  comments: [{ id: "c1", user: { id: "u1", username: "ana", displayName: "Ana" }, body: "Excelente", createdAt: "2026-01-01T00:00:00.000Z" }],
  page: 1,
  pageSize: 20,
  hasNext: false,
};

describe("SocialSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socialMocks.saveRating.mockResolvedValue({ id: "r1", stars: 4, detailedScore: 80, createdAt: "2026-01-01", updatedAt: "2026-01-01" });
    socialMocks.deleteRating.mockResolvedValue(null);
    socialMocks.getRatings.mockResolvedValue(ratings);
    socialMocks.getComments.mockResolvedValue(comments);
    socialMocks.createComment.mockResolvedValue({ id: "c2", user: { id: "u1", username: "ana", displayName: "Ana" }, body: "Nuevo", createdAt: "2026-01-01" });
    socialMocks.updateComment.mockResolvedValue({ ...comments.comments[0], body: "Editado" });
    socialMocks.deleteComment.mockResolvedValue(null);
  });

  it("muestra lectura pública y login requerido sin controles de mutación", () => {
    renderWithIntl(<SocialSection target="artist" targetId="a1b2c3d4-0000-4000-8000-000000000001" ratings={ratings} comments={comments} />);

    expect(screen.getByText("Valoraciones")).toBeInTheDocument();
    expect(screen.getByText("Excelente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Iniciá sesión para valorar" })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("button", { name: "Guardar valoración" })).not.toBeInTheDocument();
  });

  it("permite guardar rating y publicar comentarios con sesión", async () => {
    const user = userEvent.setup();
    socialMocks.getRatings.mockResolvedValue({ own: { id: "r1", stars: 4, detailedScore: 80, createdAt: "2026-01-01", updatedAt: "2026-01-01" }, aggregate: { count: 2, averageStars: 4.5, averageDetailedScore: 85 } });
    renderWithIntl(<SocialSection target="release-group" targetId="a1b2c3d4-0000-4000-8000-000000000002" ratings={ratings} comments={{ ...comments, comments: [] }} userId="u1" />);

    await user.click(screen.getByRole("radio", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Guardar valoración" }));
    await waitFor(() => expect(socialMocks.saveRating).toHaveBeenCalledWith("release-group", "a1b2c3d4-0000-4000-8000-000000000002", { stars: 4 }));
    expect(await screen.findByText("2 valoraciones · promedio 4.5")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Comentario"), "Nuevo");
    await user.click(screen.getByRole("button", { name: "Publicar comentario" }));
    await waitFor(() => expect(socialMocks.createComment).toHaveBeenCalledWith("release-group", "a1b2c3d4-0000-4000-8000-000000000002", "Nuevo"));
  });

  it("actualiza contador y promedio después de borrar un rating", async () => {
    const user = userEvent.setup();
    socialMocks.getRatings
      .mockResolvedValueOnce({ own: { id: "r1", stars: 4, detailedScore: 80, createdAt: "2026-01-01", updatedAt: "2026-01-01" }, aggregate: { count: 2, averageStars: 4.5, averageDetailedScore: 85 } })
      .mockResolvedValueOnce({ own: null, aggregate: { count: 1, averageStars: 5, averageDetailedScore: 90 } });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithIntl(<SocialSection target="artist" targetId="a1b2c3d4-0000-4000-8000-000000000001" ratings={ratings} comments={{ ...comments, comments: [] }} userId="u1" />);

    await user.click(screen.getByRole("radio", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Guardar valoración" }));
    await user.click(await screen.findByRole("button", { name: "Borrar" }));

    await waitFor(() => expect(socialMocks.deleteRating).toHaveBeenCalledWith("artist", "a1b2c3d4-0000-4000-8000-000000000001"));
    expect(await screen.findByText("1 valoración · promedio 5.0")).toBeInTheDocument();
  });

  it("limita editar y borrar comentarios al propietario y confirma el borrado", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithIntl(<SocialSection target="recording" targetId="a1b2c3d4-0000-4000-8000-000000000003" ratings={ratings} comments={comments} userId="u1" />);

    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Borrar" }));
    await waitFor(() => expect(socialMocks.deleteComment).toHaveBeenCalledWith("c1"));
  });

  it("localiza el estado anónimo en inglés", () => {
    renderWithIntl(<SocialSection target="artist" targetId="a1b2c3d4-0000-4000-8000-000000000001" ratings={{ own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } }} comments={{ ...comments, comments: [] }} />, "en");
    expect(screen.getByText("No ratings yet.")).toBeInTheDocument();
    expect(screen.getByText("Log in to comment")).toBeInTheDocument();
  });

  it("muestra el error localizado según ApiError.code", async () => {
    const user = userEvent.setup();
    socialMocks.saveRating.mockRejectedValue(new ApiError("INVALID_RATING", 400, "invalid"));
    renderWithIntl(<SocialSection target="artist" targetId="a1b2c3d4-0000-4000-8000-000000000001" ratings={ratings} comments={{ ...comments, comments: [] }} userId="u1" />);

    await user.click(screen.getByRole("radio", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Guardar valoración" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Revisá los valores de la valoración.");
  });

  it("carga y concatena la siguiente página de comentarios", async () => {
    const user = userEvent.setup();
    socialMocks.getComments.mockResolvedValue({
      comments: [{ id: "c2", user: { id: "u2", username: "luz", displayName: "Luz" }, body: "También", createdAt: "2026-01-02" }],
      page: 2,
      pageSize: 1,
      hasNext: false,
    });
    renderWithIntl(<SocialSection target="artist" targetId="a1b2c3d4-0000-4000-8000-000000000001" ratings={ratings} comments={{ ...comments, pageSize: 1, hasNext: true }} />);

    await user.click(screen.getByRole("button", { name: "Cargar más comentarios" }));

    expect(await screen.findByText("También")).toBeInTheDocument();
    expect(screen.getByText("Excelente")).toBeInTheDocument();
    expect(socialMocks.getComments).toHaveBeenCalledWith("artist", "a1b2c3d4-0000-4000-8000-000000000001", 2, 1);
    expect(screen.queryByRole("button", { name: "Cargar más comentarios" })).not.toBeInTheDocument();
  });
});
