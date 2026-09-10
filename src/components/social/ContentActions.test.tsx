import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ContentActions } from "./ContentActions";
import { apiFetch } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn(), ApiError: class ApiError extends Error {} }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("ContentActions", () => {
  it("muestra reportar y bloquear al autor", () => {
    renderWithIntl(<ContentActions targetType="comment" targetId="c1" authorUsername="ana" authorId="u1" />);

    expect(screen.getByRole("button", { name: "Reportar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bloquear a @ana" })).toBeInTheDocument();
  });

  it("envía un reporte con motivo", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ report: { id: "r1" } });
    renderWithIntl(<ContentActions targetType="review" targetId="rv1" authorUsername="ana" authorId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Reportar" }));
    fireEvent.change(screen.getByPlaceholderText("Contanos por qué lo reportás"), { target: { value: "Spam" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/moderation/reports",
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ targetType: "review", targetId: "rv1", reason: "Spam" }),
        }),
      );
    });
    expect(await screen.findByText("Reporte enviado. Gracias.")).toBeInTheDocument();
  });

  it("bloquea al autor tras confirmar y avisa al padre", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(apiFetch).mockResolvedValue({ blocked: true });
    const onBlocked = vi.fn();
    renderWithIntl(<ContentActions targetType="comment" targetId="c1" authorUsername="ana" authorId="u1" onBlocked={onBlocked} />);

    fireEvent.click(screen.getByRole("button", { name: "Bloquear a @ana" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/users/ana/block",
        expect.anything(),
        { method: "PUT" },
      );
    });
    expect(onBlocked).toHaveBeenCalled();
  });

  it("no bloquea si se cancela la confirmación", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithIntl(<ContentActions targetType="comment" targetId="c1" authorUsername="ana" authorId="u1" />);

    fireEvent.click(screen.getByRole("button", { name: "Bloquear a @ana" }));

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("un usuario normal no ve la acción de suspender", () => {
    renderWithIntl(<ContentActions targetType="comment" targetId="c1" authorUsername="ana" authorId="u1" />);

    expect(screen.queryByRole("button", { name: "Suspender a @ana" })).not.toBeInTheDocument();
  });

  it("un moderador suspende al autor desde el posteo", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ restriction: { id: "r1" } });
    renderWithIntl(
      <ContentActions targetType="comment" targetId="c1" authorUsername="ana" authorId="u1" canModerate />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Suspender a @ana" }));
    fireEvent.change(screen.getByPlaceholderText("Motivo de la suspensión"), { target: { value: "Spam" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Suspender" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        "/api/moderation/restrictions",
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('"userId":"u1"'),
        }),
      );
    });
    const [, , init] = vi.mocked(apiFetch).mock.calls.find(([path]) => path === "/api/moderation/restrictions")!;
    const parsed = JSON.parse(String(init?.body));
    expect(parsed.reason).toBe("Spam");
    expect(new Date(parsed.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(await screen.findByText("Suspensión aplicada.")).toBeInTheDocument();
  });
});