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
  return {
    apiFetch: vi.fn(),
    ApiError,
    replace: vi.fn(),
  };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({ replace: mocks.replace, push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api/client", () => ({
  apiFetch: mocks.apiFetch,
  ApiError: mocks.ApiError,
}));

const ana = {
  id: "00000000-0000-4000-8000-000000000001",
  username: "ana",
  displayName: null,
  profileVisibility: "public",
  relation: "none",
};

function response(users: unknown[], hasNext = false, page = 1) {
  return { users, page, pageSize: 20, hasNext };
}

describe("UserSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exige un término antes de buscar", async () => {
    const user = userEvent.setup();
    renderWithIntl(<UserSearch authenticated />);
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    expect(screen.getByText("Escribí un término para buscar.")).toBeInTheDocument();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("busca al enviar, sincroniza la URL y muestra resultados con relación", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(response([ana]));
    renderWithIntl(<UserSearch authenticated />);

    await user.type(screen.getByLabelText("Buscar usuarios"), "ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users?q=ana&page=1",
        expect.anything(),
      ),
    );
    expect(mocks.replace).toHaveBeenCalledWith("/users?q=ana");
    expect(await screen.findByText('Resultados para "ana"')).toBeInTheDocument();
    expect(screen.getByText("1 usuario")).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
  });

  it("ejecuta la búsqueda inicial desde q y no duplica requests", async () => {
    mocks.apiFetch.mockResolvedValue(response([ana]));
    renderWithIntl(<UserSearch authenticated initialQuery="ana" />);

    expect(await screen.findByText("@ana")).toBeInTheDocument();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/users?q=ana&page=1", expect.anything());
  });

  it("muestra el estado vacío cuando no hay coincidencias", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(response([]));
    renderWithIntl(<UserSearch authenticated />);

    await user.type(screen.getByLabelText("Buscar usuarios"), "zzz");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("mantiene el formulario visible y muestra un error localizado al fallar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR", 500, "boom"));
    renderWithIntl(<UserSearch authenticated />);

    await user.type(screen.getByLabelText("Buscar usuarios"), "ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("No pudimos completar la solicitud. Intentá de nuevo en un momento.")).toBeInTheDocument();
    // El formulario sigue presente para poder reintentar sin perder el término.
    expect(screen.getByLabelText("Buscar usuarios")).toHaveValue("ana");
  });

  it("trata excepciones desconocidas como error interno localizado", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new Error("boom"));
    renderWithIntl(<UserSearch authenticated />);

    await user.type(screen.getByLabelText("Buscar usuarios"), "ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("Error inesperado")).toBeInTheDocument();
  });

  it("carga más resultados sin reemplazar los anteriores", async () => {
    const user = userEvent.setup();
    const mateo = {
      id: "00000000-0000-4000-8000-000000000002",
      username: "mateo",
      displayName: "Mateo",
      profileVisibility: "public",
      relation: "none",
    };
    mocks.apiFetch
      .mockResolvedValueOnce(response([ana], true, 1))
      .mockResolvedValueOnce(response([mateo], false, 2));
    renderWithIntl(<UserSearch authenticated />);

    await user.type(screen.getByLabelText("Buscar usuarios"), "a");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(await screen.findByText("@ana")).toBeInTheDocument();
    const loadMore = await screen.findByRole("button", { name: "Cargar más usuarios" });
    expect(screen.getByText("1 usuario cargado")).toBeInTheDocument();

    await user.click(loadMore);

    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenLastCalledWith("/api/users?q=a&page=2", expect.anything()),
    );
    expect(await screen.findByText("@mateo")).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("2 usuarios")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargar más usuarios" })).not.toBeInTheDocument();
  });
});
