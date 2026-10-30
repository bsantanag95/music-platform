import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { NotificationPreferencesResponse } from "@/lib/api/schemas";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn(), refresh: vi.fn() }));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: mocks.apiFetch,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const ALL_ON = {
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
  artist_award: true,
} as const;

function settings(
  overrides: Partial<NotificationPreferencesResponse> = {},
): NotificationPreferencesResponse {
  return {
    preferences: { ...ALL_ON },
    emailDigest: false,
    emailVerified: true,
    ...overrides,
  };
}

function renderForm(initial: Partial<NotificationPreferencesResponse> = {}) {
  return renderWithIntl(<NotificationPreferencesForm initial={settings(initial)} />);
}

describe("NotificationPreferencesForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pinta un interruptor por tipo opcional, con su estado", () => {
    renderForm({ preferences: { ...ALL_ON, new_follower: false } });

    // Diez tipos desactivables (los premios son una sola clave) y el resumen.
    expect(screen.getAllByRole("switch")).toHaveLength(11);
    expect(screen.getByRole("switch", { name: "Nuevos seguidores" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("switch", { name: "Respuestas a tus temas" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("separa las preferencias en las secciones Para ti, Novedades y Por email", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "Para ti" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Novedades" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Por email" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Discos nuevos" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Discos anunciados" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Sencillos nuevos" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Hitos de me gusta" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Hitos de guardados" })).toBeInTheDocument();
  });

  it("los premios son una sola preferencia en Novedades", () => {
    renderForm();

    expect(
      screen.getByRole("switch", { name: "Premios de artistas que sigues" }),
    ).toBeInTheDocument();
    // Las dos clases de aviso no se ofrecen por separado (D6).
    expect(screen.queryByRole("switch", { name: /nominaci/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: /gana/i })).not.toBeInTheDocument();
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
    mocks.apiFetch.mockResolvedValue(
      settings({ preferences: { ...ALL_ON, new_follower: false } }),
    );
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
    mocks.apiFetch.mockResolvedValue(settings());
    renderForm({ preferences: { ...ALL_ON, comment_reply: false } });

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

  it("activar el resumen envía emailDigest y adopta la respuesta", async () => {
    mocks.apiFetch.mockResolvedValue(settings({ emailDigest: true }));
    renderForm();

    await userEvent.click(screen.getByRole("switch", { name: "Resumen semanal" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/notification-preferences",
      expect.anything(),
      { method: "PUT", body: JSON.stringify({ emailDigest: true }) },
    );
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Resumen semanal" })).toHaveAttribute(
        "aria-checked",
        "true",
      ),
    );
    // El menú de Ajustes resume el resumen semanal desde el layout: se vuelve a pedir.
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("sin email verificado el resumen está deshabilitado y se ofrece verificarlo", async () => {
    renderForm({ emailVerified: false });

    expect(screen.getByRole("switch", { name: "Resumen semanal" })).toBeDisabled();
    expect(screen.getByText("Verifica tu email para activarlo.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Verificar email" });
    expect(link).toHaveAttribute("href", "/me/settings/account");
  });

  it("con el email verificado no aparece el aviso de verificación", () => {
    renderForm();

    expect(screen.queryByText("Verifica tu email para activarlo.")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Verificar email" })).not.toBeInTheDocument();
  });

  it("si falla el resumen, revierte el interruptor y explica el error", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mocks.apiFetch.mockRejectedValue(new ApiError("EMAIL_NOT_VERIFIED", 409, "no"));
    renderForm();

    await userEvent.click(screen.getByRole("switch", { name: "Resumen semanal" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Resumen semanal" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });
});
