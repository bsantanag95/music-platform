import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { UnsubscribeConfirm } from "./UnsubscribeConfirm";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: mocks.apiFetch,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const TOKEN = "abc.def";

describe("UnsubscribeConfirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pide confirmar antes de hacer nada", () => {
    renderWithIntl(<UnsubscribeConfirm token={TOKEN} />);

    expect(screen.getByRole("heading", { name: "Darte de baja del resumen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Darte de baja" })).toBeInTheDocument();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("confirma con un POST al endpoint de un clic y muestra el resultado", async () => {
    mocks.apiFetch.mockResolvedValue({ unsubscribed: true });
    renderWithIntl(<UnsubscribeConfirm token={TOKEN} />);

    await userEvent.click(screen.getByRole("button", { name: "Darte de baja" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/notifications/unsubscribe?token=abc.def",
      expect.anything(),
      { method: "POST" },
    );
    expect(await screen.findByRole("heading", { name: "Resumen desactivado" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajustes de notificaciones" })).toHaveAttribute(
      "href",
      "/me/settings/notifications",
    );
  });

  it("escapa el token en la URL", async () => {
    mocks.apiFetch.mockResolvedValue({ unsubscribed: true });
    renderWithIntl(<UnsubscribeConfirm token="a+b/c=" />);

    await userEvent.click(screen.getByRole("button", { name: "Darte de baja" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/notifications/unsubscribe?token=a%2Bb%2Fc%3D",
      expect.anything(),
      { method: "POST" },
    );
  });

  it("un token rechazado por el servidor se muestra como enlace inválido", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mocks.apiFetch.mockRejectedValue(new ApiError("INVALID_UNSUBSCRIBE_TOKEN", 400, "no"));
    renderWithIntl(<UnsubscribeConfirm token={TOKEN} />);

    await userEvent.click(screen.getByRole("button", { name: "Darte de baja" }));

    expect(await screen.findByRole("heading", { name: "Link inválido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Darte de baja" })).not.toBeInTheDocument();
  });

  it("un fallo de red explica el error y deja reintentar", async () => {
    mocks.apiFetch.mockRejectedValue(new Error("sin red"));
    renderWithIntl(<UnsubscribeConfirm token={TOKEN} />);

    await userEvent.click(screen.getByRole("button", { name: "Darte de baja" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Darte de baja" })).toBeEnabled();
  });
});
