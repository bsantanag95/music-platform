import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { UNDO_TOAST_MS } from "@/components/ui/UndoToast";
import { FollowRequestList } from "./FollowRequestList";

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

const request = (id: string, username: string, youFollow: "accepted" | "pending" | null = null) => ({
  id,
  username,
  displayName: null,
  profileVisibility: "public" as const,
  avatarUrl: null,
  requestedAt: "2026-10-27T12:00:00.000Z",
  youFollow,
});

const page = {
  users: [request("u1", "leo"), request("u2", "mia", "accepted"), request("u3", "noa")],
  hasNext: false,
  nextCursor: null,
  total: 3,
};

const fetchMock = vi.fn();

function setup() {
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

function rowOf(username: string) {
  return screen.getByText(`@${username}`, { exact: false }).closest("li")!;
}

describe("FollowRequestList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sin solicitudes muestra el vacío que recibe", () => {
    renderWithIntl(
      <FollowRequestList initial={{ users: [], hasNext: false, nextCursor: null, total: 0 }} empty={<p>Vacío</p>} />,
    );
    expect(screen.getByText("Vacío")).toBeInTheDocument();
  });

  it("filas con cuánto hace y la cifra de pendientes", () => {
    renderWithIntl(<FollowRequestList initial={page} empty={null} />);
    expect(screen.getByText("3 solicitudes pendientes")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Aprobar" })).toHaveLength(3);
    expect(rowOf("leo").textContent).toMatch(/hace/);
  });

  it("rechazar quita la fila y Deshacer la devuelve sin llamar al servidor", async () => {
    const user = setup();
    renderWithIntl(<FollowRequestList initial={page} empty={null} />);
    await user.click(within(rowOf("leo")).getByRole("button", { name: "Rechazar" }));
    expect(screen.queryByText("@leo", { exact: false })).toBeNull();
    expect(screen.getByText("2 solicitudes pendientes")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByText("@leo", { exact: false })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el rechazo se envía al vencer el aviso; si falla, la fila vuelve", async () => {
    const user = setup();
    renderWithIntl(<FollowRequestList initial={page} empty={null} />);
    await user.click(within(rowOf("leo")).getByRole("button", { name: "Rechazar" }));
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/me/follow-requests/u1/reject",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    await user.click(within(rowOf("mia")).getByRole("button", { name: "Rechazar" }));
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    expect(await screen.findByText(/No pudimos rechazar la solicitud de mia/)).toBeInTheDocument();
    expect(screen.getByText("@mia", { exact: false })).toBeInTheDocument();
  });

  it("al salir de la vista se envía el rechazo pendiente con keepalive", async () => {
    const user = setup();
    const { unmount } = renderWithIntl(<FollowRequestList initial={page} empty={null} />);
    await user.click(within(rowOf("noa")).getByRole("button", { name: "Rechazar" }));
    unmount();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/follow-requests/u3/reject",
      expect.objectContaining({ keepalive: true }),
    );
  });

  it("aprobar deja la fila con Seguir de vuelta, o dice que ya la sigues", async () => {
    mocks.apiFetch.mockResolvedValue(null);
    const user = setup();
    renderWithIntl(<FollowRequestList initial={page} empty={null} />);

    await user.click(within(rowOf("leo")).getByRole("button", { name: "Aprobar" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith("/api/me/follow-requests/u1/approve", expect.anything(), {
        method: "POST",
      }),
    );
    expect(within(rowOf("leo")).getByText("Aprobada · ahora te sigue")).toBeInTheDocument();
    expect(within(rowOf("leo")).getByRole("button", { name: "Seguir de vuelta" })).toBeInTheDocument();
    expect(screen.getByText("2 solicitudes pendientes")).toBeInTheDocument();

    await user.click(within(rowOf("mia")).getByRole("button", { name: "Aprobar" }));
    expect(await within(rowOf("mia")).findByText("Ya la sigues")).toBeInTheDocument();
  });

  it("si la solicitud ya no existe, la fila sale con un aviso", async () => {
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("REQUEST_NOT_FOUND", "no"));
    const user = setup();
    renderWithIntl(<FollowRequestList initial={page} empty={null} />);
    await user.click(within(rowOf("leo")).getByRole("button", { name: "Aprobar" }));
    expect(await screen.findByText("leo retiró su solicitud.")).toBeInTheDocument();
    expect(screen.queryByText("@leo", { exact: false })).toBeNull();
  });

  it("Mostrar más trae la página siguiente por cursor", async () => {
    mocks.apiFetch.mockResolvedValue({ users: [request("u9", "pia")], hasNext: false, nextCursor: null, total: 4 });
    const user = setup();
    renderWithIntl(
      <FollowRequestList initial={{ ...page, hasNext: true, nextCursor: "c1", total: 4 }} empty={null} />,
    );
    await user.click(screen.getByRole("button", { name: "Mostrar 1 más" }));
    expect(await screen.findByText("@pia", { exact: false })).toBeInTheDocument();
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/me/follow-requests?cursor=c1", expect.anything());
  });
});

