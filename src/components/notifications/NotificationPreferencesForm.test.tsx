import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { NotificationPreferencesValue } from "@/lib/api/schemas";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: mocks.apiFetch,
}));

const ALL_ON: NotificationPreferencesValue = {
  comment_reply: true,
  thread_reply: true,
  new_follower: true,
  follow_request: true,
  follow_accepted: true,
  moderation: true,
  comment_like_milestone: true,
  list_save_milestone: true,
  artist_release: true,
  artist_release_announced: true,
  artist_single: true,
};

function renderForm(initial: Partial<NotificationPreferencesValue> = {}) {
  return renderWithIntl(<NotificationPreferencesForm initial={{ ...ALL_ON, ...initial }} />);
}

describe("NotificationPreferencesForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pinta un interruptor por tipo opcional, con su estado", () => {
    renderForm({ new_follower: false });

    const switches = screen.getAllByRole("switch");
    expect(switches).toHaveLength(9);
    expect(screen.getByRole("switch", { name: "Nuevos seguidores" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("switch", { name: "Respuestas a tus temas" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("separa las preferencias en las secciones Para ti y Novedades", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "Para ti" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Novedades" })).toBeInTheDocument();
    // Los tres avisos de lanzamientos son opcionales y viven en su sección.
    expect(screen.getByRole("switch", { name: "Discos nuevos" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Discos anunciados" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Sencillos nuevos" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Hitos de me gusta" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Hitos de guardados" })).toBeInTheDocument();
  });

  it("los tipos fijos no tienen interruptor: se explican como siempre activas", () => {
    renderForm();

    expect(screen.queryByRole("switch", { name: "Solicitudes de seguimiento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Avisos de moderación" })).not.toBeInTheDocument();
    expect(screen.getByText("Solicitudes de seguimiento")).toBeInTheDocument();
    expect(screen.getByText("Avisos de moderación")).toBeInTheDocument();
    expect(screen.getAllByText("Siempre activas")).toHaveLength(2);
  });

  it("guarda el cambio y adopta las preferencias que devuelve el servidor", async () => {
    mocks.apiFetch.mockResolvedValue({ preferences: { ...ALL_ON, new_follower: false } });
    renderForm();

    await userEvent.click(screen.getByRole("switch", { name: "Nuevos seguidores" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/notification-preferences",
      expect.anything(),
      {
        method: "PUT",
        body: JSON.stringify({ preferences: { new_follower: false } }),
      },
    );
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Nuevos seguidores" })).toHaveAttribute(
        "aria-checked",
        "false",
      ),
    );
  });

  it("si falla, revierte el interruptor y explica el error", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mocks.apiFetch.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "no"));
    renderForm();

    await userEvent.click(screen.getByRole("switch", { name: "Nuevos seguidores" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Nuevos seguidores" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("reencender un tipo envía true y no depende del valor previo del servidor", async () => {
    mocks.apiFetch.mockResolvedValue({ preferences: ALL_ON });
    renderForm({ comment_reply: false });

    await userEvent.click(screen.getByRole("switch", { name: "Respuestas a tus temas" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/notification-preferences",
      expect.anything(),
      {
        method: "PUT",
        body: JSON.stringify({ preferences: { comment_reply: true } }),
      },
    );
  });
});
