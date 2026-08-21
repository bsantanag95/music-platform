import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { UserSummary } from "@/lib/api/schemas";
import { UserList } from "./UserList";

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

const users: UserSummary[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    username: "ana",
    displayName: "Ana",
    profileVisibility: "public",
  },
];

describe("UserList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("elimina un seguidor propio y quita la fila", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(null);
    renderWithIntl(<UserList users={users} variant="followers" />);

    expect(screen.getByText("@ana")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar seguidor" }));

    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/me/followers/00000000-0000-4000-8000-000000000001",
        expect.anything(),
        { method: "DELETE" },
      ),
    );
    expect(screen.queryByText("@ana")).not.toBeInTheDocument();
  });

  it("deja de seguir desde la lista de seguidos", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ relation: "none" });
    renderWithIntl(<UserList users={users} variant="following" />);

    await user.click(screen.getByRole("button", { name: "Dejar de seguir" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users/ana/follow",
        expect.anything(),
        { method: "DELETE" },
      ),
    );
    expect(screen.queryByText("@ana")).not.toBeInTheDocument();
  });

  it("desbloquea desde la lista de bloqueados", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ blocked: false });
    renderWithIntl(<UserList users={users} variant="blocks" />);

    await user.click(screen.getByRole("button", { name: "Desbloquear" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users/ana/block",
        expect.anything(),
        { method: "DELETE" },
      ),
    );
    expect(screen.queryByText("@ana")).not.toBeInTheDocument();
  });

  it("aprueba una solicitud desde la lista de solicitudes", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(null);
    renderWithIntl(<UserList users={users} variant="requests" />);

    await user.click(screen.getByRole("button", { name: "Aprobar" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/me/follow-requests/00000000-0000-4000-8000-000000000001/approve",
        expect.anything(),
        { method: "POST" },
      ),
    );
    expect(screen.queryByText("@ana")).not.toBeInTheDocument();
  });
});