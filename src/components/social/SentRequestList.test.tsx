import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { UNDO_TOAST_MS } from "@/components/ui/UndoToast";
import { SentRequestList } from "./SentRequestList";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }));

const sent = (id: string, username: string) => ({
  id,
  username,
  displayName: null,
  profileVisibility: "private" as const,
  avatarUrl: null,
  requestedAt: "2026-10-25T12:00:00.000Z",
});
const page = { users: [sent("u1", "leo"), sent("u2", "mia")], hasNext: false, nextCursor: null, total: 2 };
const fetchMock = vi.fn();

function setup() {
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}
function rowOf(username: string) {
  return screen.getByText(`@${username}`, { exact: false }).closest("li")!;
}

describe("SentRequestList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("filas con cuándo se pidió y la cifra", () => {
    renderWithIntl(<SentRequestList initial={page} empty={null} />);
    expect(screen.getByText("2 solicitudes enviadas sin respuesta")).toBeInTheDocument();
    expect(rowOf("leo").textContent).toMatch(/la pediste hace/);
  });

  it("vacío", () => {
    renderWithIntl(
      <SentRequestList initial={{ users: [], hasNext: false, nextCursor: null, total: 0 }} empty={<p>Nada</p>} />,
    );
    expect(screen.getByText("Nada")).toBeInTheDocument();
  });

  it("cancelar y deshacer no llama al servidor", async () => {
    const user = setup();
    renderWithIntl(<SentRequestList initial={page} empty={null} />);
    await user.click(within(rowOf("leo")).getByRole("button", { name: "Cancelar solicitud" }));
    expect(screen.queryByText("@leo", { exact: false })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByText("@leo", { exact: false })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("la cancelación se envía al vencer el aviso", async () => {
    const user = setup();
    renderWithIntl(<SentRequestList initial={page} empty={null} />);
    await user.click(within(rowOf("mia")).getByRole("button", { name: "Cancelar solicitud" }));
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/users/mia/follow", expect.objectContaining({ method: "DELETE" })),
    );
    expect(screen.getByText("1 solicitud enviada sin respuesta")).toBeInTheDocument();
  });

  it("Mostrar más pide las enviadas por cursor", async () => {
    mocks.apiFetch.mockResolvedValue({ users: [sent("u3", "noa")], hasNext: false, nextCursor: null, total: 3 });
    const user = setup();
    renderWithIntl(<SentRequestList initial={{ ...page, hasNext: true, nextCursor: "c1", total: 3 }} empty={null} />);
    await user.click(screen.getByRole("button", { name: "Mostrar 1 más" }));
    expect(await screen.findByText("@noa", { exact: false })).toBeInTheDocument();
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/me/follow-requests/sent?cursor=c1", expect.anything());
  });
});
