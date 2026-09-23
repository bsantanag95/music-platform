import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ConnectionsUserList } from "./ConnectionsUserList";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn() }),
}));

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError };
});
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));

const users = [
  { id: "u1", username: "leo", displayName: "Leo", profileVisibility: "public" as const, avatarUrl: null, relation: "none" as const },
  { id: "u2", username: "mia", displayName: null, profileVisibility: "public" as const, avatarUrl: null, relation: "following" as const },
];

describe("ConnectionsUserList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista vacía: muestra el mensaje", () => {
    renderWithIntl(<ConnectionsUserList users={[]} authenticated emptyMessage="Sin resultados" />);
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("renderiza una fila por usuario, con el FollowButton reflejando su relación", () => {
    renderWithIntl(<ConnectionsUserList users={users} authenticated emptyMessage="Sin resultados" />);
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
    expect(screen.getByText("Siguiendo")).toBeInTheDocument();
  });

  it("sin ownRemovableFollowers: no muestra la acción de quitar seguidor", () => {
    renderWithIntl(<ConnectionsUserList users={users} authenticated emptyMessage="Sin resultados" />);
    expect(screen.queryByRole("button", { name: "Eliminar seguidor" })).not.toBeInTheDocument();
  });

  it("con ownRemovableFollowers: cada fila puede quitar al seguidor", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(null);
    renderWithIntl(
      <ConnectionsUserList users={users} authenticated emptyMessage="Sin resultados" ownRemovableFollowers />,
    );

    const removeButtons = screen.getAllByRole("button", { name: "Eliminar seguidor" });
    expect(removeButtons).toHaveLength(2);

    await user.click(removeButtons[0]!);
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith("/api/me/followers/u1", expect.anything(), { method: "DELETE" }),
    );
    expect(screen.queryByText("Leo")).not.toBeInTheDocument();
    expect(screen.getByText("mia")).toBeInTheDocument();
  });

  it("error al quitar seguidor: muestra el mensaje sin quitar la fila", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("USER_NOT_FOUND", "no existe"));
    renderWithIntl(
      <ConnectionsUserList users={users} authenticated emptyMessage="Sin resultados" ownRemovableFollowers />,
    );

    await user.click(screen.getAllByRole("button", { name: "Eliminar seguidor" })[0]!);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });
});
