import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { UserSearch } from "./UserSearch";

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

const result = {
  users: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      username: "ana",
      displayName: null,
      profileVisibility: "public",
      relation: "none",
    },
  ],
  page: 1,
  pageSize: 20,
  hasNext: false,
};

describe("UserSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige un término antes de buscar", async () => {
    const user = userEvent.setup();
    renderWithIntl(<UserSearch authenticated />);
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(screen.getByText("Escribí un término para buscar.")).toBeInTheDocument();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("busca y muestra resultados con su relación", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(result);
    renderWithIntl(<UserSearch authenticated />);

    await user.type(screen.getByLabelText("Buscar usuarios"), "ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith("/api/users?q=ana", expect.anything()),
    );
    expect(await screen.findByText("@ana")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay coincidencias", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ ...result, users: [] });
    renderWithIntl(<UserSearch authenticated />);

    await user.type(screen.getByLabelText("Buscar usuarios"), "zzz");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });
});