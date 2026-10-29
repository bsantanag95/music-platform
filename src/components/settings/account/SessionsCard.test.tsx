import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { SessionsCard } from "./SessionsCard";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
// El botón de cerrar todas tiene su propia prueba.
vi.mock("@/components/settings/RevokeSessionsButton", () => ({
  RevokeSessionsButton: () => <button type="button">Cerrar todas las sesiones</button>,
}));

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const now = Date.now();
const sessions = [
  { id: id(1), deviceLabel: "Chrome · Windows", createdAt: new Date(now - 1000).toISOString(), lastSeenAt: new Date(now).toISOString(), current: true },
  { id: id(2), deviceLabel: "Safari · iPhone", createdAt: new Date(now - 7 * 86400000).toISOString(), lastSeenAt: new Date(now - 2 * 86400000).toISOString(), current: false },
  { id: id(3), deviceLabel: null, createdAt: new Date(now - 30 * 86400000).toISOString(), lastSeenAt: null, current: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.apiFetch.mockResolvedValue(null);
});

describe("SessionsCard", () => {
  it("lista cada dispositivo, marca esta sesión y muestra el desconocido localizado", () => {
    renderWithIntl(<SessionsCard sessions={sessions} />);

    expect(screen.getByText("Chrome · Windows")).toBeInTheDocument();
    expect(screen.getByText("Esta sesión")).toBeInTheDocument();
    expect(screen.getByText("Safari · iPhone")).toBeInTheDocument();
    expect(screen.getByText("Dispositivo desconocido")).toBeInTheDocument();
  });

  it("ofrece 'Cerrar' solo en las sesiones que no son esta", () => {
    renderWithIntl(<SessionsCard sessions={sessions} />);

    expect(screen.getAllByRole("button", { name: /^Cerrar la sesión de/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cerrar la sesión de Chrome · Windows" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar todas las sesiones" })).toBeInTheDocument();
  });

  it("cerrar otro dispositivo llama a la API y quita la fila", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SessionsCard sessions={sessions} />);

    await user.click(screen.getByRole("button", { name: "Cerrar la sesión de Safari · iPhone" }));

    await waitFor(() => expect(screen.queryByText("Safari · iPhone")).not.toBeInTheDocument());
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      `/api/me/sessions/${id(2)}`,
      expect.anything(),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.getByText("Chrome · Windows")).toBeInTheDocument();
  });

  it("si cerrar falla deja la fila y muestra el error", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("SESSION_NOT_FOUND"));
    renderWithIntl(<SessionsCard sessions={sessions} />);

    await user.click(screen.getByRole("button", { name: "Cerrar la sesión de Safari · iPhone" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Esa sesión ya no existe.");
    expect(screen.getByText("Safari · iPhone")).toBeInTheDocument();
  });

  it("una sesión anterior al registro de actividad no inventa una última actividad", () => {
    renderWithIntl(<SessionsCard sessions={[sessions[2]!]} />);
    expect(screen.queryByText(/Activa/)).not.toBeInTheDocument();
    expect(screen.getByText(/Iniciada el/)).toBeInTheDocument();
  });
  it("plegada: la actual y las 2 más recientes, con Ver las N más y Mostrar menos", async () => {
    const user = userEvent.setup();
    const many = [
      ...sessions,
      ...[4, 5, 6, 7].map((n) => ({
        id: id(n),
        deviceLabel: `Equipo ${n}`,
        createdAt: new Date(now - n * 86400000).toISOString(),
        lastSeenAt: new Date(now - n * 86400000).toISOString(),
        current: false,
      })),
    ];
    renderWithIntl(<SessionsCard sessions={many} />);
    expect(screen.queryByText("Equipo 4")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Ver las 4 más" }));
    expect(screen.getByText("Equipo 7")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mostrar menos" }));
    expect(screen.queryByText("Equipo 7")).toBeNull();
  });

  it("Cerrar las demás conserva solo la actual", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SessionsCard sessions={sessions} />);
    await user.click(screen.getByRole("button", { name: "Cerrar las demás (2)" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith("/api/me/sessions", expect.anything(), { method: "DELETE" }),
    );
    expect(screen.queryByText("Safari · iPhone")).toBeNull();
    expect(screen.getByText("Chrome · Windows")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cerrar las demás/ })).toBeNull();
  });

  it("solo con la actual no ofrece Cerrar las demás ni Ver más", () => {
    renderWithIntl(<SessionsCard sessions={sessions.slice(0, 1)} />);
    expect(screen.queryByRole("button", { name: /Cerrar la/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Ver/ })).toBeNull();
  });
});
