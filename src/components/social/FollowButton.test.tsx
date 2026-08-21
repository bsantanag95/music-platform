import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FollowButton } from "./FollowButton";

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
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/lib/api/client", () => ({
  apiFetch: mocks.apiFetch,
  ApiError: mocks.ApiError,
}));

describe("FollowButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ofrece iniciar sesión a visitantes anónimos", () => {
    renderWithIntl(<FollowButton username="pato" relation="none" authenticated={false} />);
    expect(screen.getByRole("link", { name: "Iniciar sesión para seguir" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });

  it("permite seguir un perfil y pasa al estado Siguiendo", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ relation: "following" });
    renderWithIntl(<FollowButton username="pato" relation="none" authenticated />);

    await user.click(screen.getByRole("button", { name: "Seguir" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users/pato/follow",
        expect.anything(),
        { method: "PUT" },
      ),
    );
    expect(await screen.findByText("Siguiendo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dejar de seguir" })).toBeInTheDocument();
  });

  it("muestra solicitud enviada y permite cancelarla", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ relation: "none" });
    renderWithIntl(<FollowButton username="pato" relation="requested" authenticated />);

    expect(screen.getByText("Solicitud enviada")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar solicitud" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users/pato/follow",
        expect.anything(),
        { method: "DELETE" },
      ),
    );
    expect(await screen.findByRole("button", { name: "Seguir" })).toBeInTheDocument();
  });

  it("muestra el error localizado según ApiError.code", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("BLOCKED", 403, "x"));
    renderWithIntl(<FollowButton username="pato" relation="none" authenticated />);

    await user.click(screen.getByRole("button", { name: "Seguir" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No podés realizar esta acción con esta cuenta.",
    );
  });

  it("aprueba una solicitud entrante", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(null);
    renderWithIntl(
      <FollowButton username="pato" relation="incoming" authenticated requestId="u1" />,
    );

    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/me/follow-requests/u1/approve",
        expect.anything(),
        { method: "POST" },
      ),
    );
  });

  it("rechaza una solicitud entrante", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(null);
    renderWithIntl(
      <FollowButton username="pato" relation="incoming" authenticated requestId="u1" />,
    );

    await user.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/me/follow-requests/u1/reject",
        expect.anything(),
        { method: "POST" },
      ),
    );
  });

  it("muestra perfil propio sin acciones", () => {
    renderWithIntl(<FollowButton username="ana" relation="self" authenticated />);
    expect(screen.getByText("Perfil propio")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("muestra bloqueado sin acciones", () => {
    renderWithIntl(<FollowButton username="pato" relation="blocked" authenticated />);
    expect(screen.getByText("Bloqueado")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});