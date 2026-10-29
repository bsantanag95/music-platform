import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { UNDO_TOAST_MS } from "@/components/ui/UndoToast";
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
  { id: "u2", username: "mia", displayName: null, profileVisibility: "public" as const, avatarUrl: null, relation: "following" as const, followsYou: true },
  { id: "u3", username: "noa", displayName: "Noa", profileVisibility: "private" as const, avatarUrl: null, relation: "requested" as const },
];

const fetchMock = vi.fn();

function setup() {
  return userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
}

async function openMenu(user: ReturnType<typeof setup>, name: string) {
  await user.click(screen.getByRole("button", { name: `Acciones para «${name}»` }));
}

describe("ConnectionsUserList", () => {
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

  it("lista vacía: muestra lo que se le pasa", () => {
    renderWithIntl(<ConnectionsUserList users={[]} authenticated empty={<p>Sin resultados</p>} />);
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("una acción visible por fila según la relación; quitar va al menú", () => {
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} />);
    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
    expect(screen.getByText("Mutuo")).toBeInTheDocument();
    expect(screen.getByText("Solicitud enviada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dejar de seguir" })).toBeNull();
    expect(screen.getByRole("button", { name: "Acciones para «mia»" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acciones para «Leo»" })).toBeNull();
  });

  it("sin sesión: filas sin acciones", () => {
    renderWithIntl(<ConnectionsUserList users={users} authenticated={false} empty={null} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("eliminar seguidor: confirma, quita la fila y Deshacer la devuelve sin llamar al servidor", async () => {
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} ownRemovableFollowers />);

    await openMenu(user, "Leo");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar seguidor…" }));
    expect(screen.getByText("¿Eliminar a Leo de tus seguidores?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(screen.queryByText("Leo")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(screen.getByText("Leo")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cancelar la confirmación no quita a nadie", async () => {
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} ownRemovableFollowers />);
    await openMenu(user, "Leo");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar seguidor…" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("eliminar seguidor: al vencer el aviso se envía la petición", async () => {
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} ownRemovableFollowers />);
    await openMenu(user, "Leo");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar seguidor…" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/me/followers/u1", expect.objectContaining({ method: "DELETE" })),
    );
    expect(screen.queryByText("Leo")).toBeNull();
  });

  it("si la petición falla, la fila vuelve y el aviso lo dice", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} ownRemovableFollowers />);
    await openMenu(user, "Leo");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar seguidor…" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));

    expect(await screen.findByText("No pudimos eliminar a Leo. Inténtalo de nuevo.")).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("dejar de seguir en una lista ajena: la fila queda, Seguir deshace", async () => {
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} />);
    await openMenu(user, "mia");
    await user.click(screen.getByRole("menuitem", { name: "Dejar de seguir" }));

    expect(screen.getByText("mia")).toBeInTheDocument();
    expect(screen.getByText("Dejaste de seguir a mia.")).toBeInTheDocument();
    // mia te sigue: mientras espera el Deshacer, "Seguir de vuelta" deshace.
    await user.click(screen.getByRole("button", { name: "Seguir de vuelta" }));
    expect(screen.getByText("Mutuo")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dejar de seguir en los propios Seguidos: quita la fila y se envía al vencer", async () => {
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} ownFollowing />);
    await openMenu(user, "mia");
    await user.click(screen.getByRole("menuitem", { name: "Dejar de seguir" }));
    expect(screen.queryByText("mia")).toBeNull();

    act(() => vi.advanceTimersByTime(UNDO_TOAST_MS + 100));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/users/mia/follow", expect.objectContaining({ method: "DELETE" })),
    );
  });

  it("una segunda acción envía la primera", async () => {
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} ownRemovableFollowers />);
    await openMenu(user, "Leo");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar seguidor…" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await openMenu(user, "mia");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar seguidor…" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("/api/me/followers/u1", expect.anything());
  });

  it("al desmontar se envía lo pendiente con keepalive", async () => {
    const user = setup();
    const { unmount } = renderWithIntl(
      <ConnectionsUserList users={users} authenticated empty={null} ownRemovableFollowers />,
    );
    await openMenu(user, "Leo");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar seguidor…" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    unmount();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/followers/u1",
      expect.objectContaining({ method: "DELETE", keepalive: true }),
    );
  });

  it("cancelar una solicitud es inmediato", async () => {
    mocks.apiFetch.mockResolvedValue({ relation: "none" });
    const user = setup();
    renderWithIntl(<ConnectionsUserList users={users} authenticated empty={null} />);
    await openMenu(user, "Noa");
    await user.click(screen.getByRole("menuitem", { name: "Cancelar solicitud" }));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith("/api/users/noa/follow", expect.anything(), { method: "DELETE" }),
    );
    expect(await screen.findByRole("button", { name: "Solicitar seguir" })).toBeInTheDocument();
  });

  it("Mostrar más: dice cuántas faltan y trae la página siguiente por cursor", async () => {
    mocks.apiFetch.mockResolvedValue({
      users: [
        { id: "u4", username: "pia", displayName: null, profileVisibility: "public", avatarUrl: null, relation: "none", followsYou: false },
        users[0],
      ],
      hasNext: false,
      nextCursor: null,
      total: 5,
    });
    const user = setup();
    renderWithIntl(
      <ConnectionsUserList
        users={users}
        authenticated
        empty={null}
        paging={{ username: "ana", kind: "followers", total: 5, hasNext: true, nextCursor: "c1" }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Mostrar 2 más" }));
    await waitFor(() => expect(screen.getByText("pia")).toBeInTheDocument());
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/users/ana/connections/followers?cursor=c1", expect.anything());
    expect(screen.getAllByText("Leo")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Mostrar/ })).toBeNull();
  });
  it("buscar recarga la primera página con el filtro y lo escribe en la URL", async () => {
    mocks.apiFetch.mockResolvedValue({ users: [users[1]], hasNext: false, nextCursor: null, total: 1 });
    const user = setup();
    renderWithIntl(
      <ConnectionsUserList
        users={users}
        authenticated
        empty={null}
        paging={{ username: "ana", kind: "followers", total: 3, hasNext: false, nextCursor: null }}
        filters={{ initial: { q: "", sort: "recent", segment: "all" }, defaultSort: "recent" }}
      />,
    );
    await user.type(screen.getByRole("searchbox", { name: "Buscar por nombre o @usuario" }), "mi");
    act(() => vi.advanceTimersByTime(300));
    await waitFor(() =>
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/api/users/ana/connections/followers?q=mi&sort=recent",
        expect.anything(),
      ),
    );
    await waitFor(() => expect(screen.queryByText("Leo")).toBeNull());
    expect(window.location.search).toContain("q=mi");
  });

  it("sin coincidencias: lo dice en lugar del vacío", async () => {
    mocks.apiFetch.mockResolvedValue({ users: [], hasNext: false, nextCursor: null, total: 0 });
    const user = setup();
    renderWithIntl(
      <ConnectionsUserList
        users={users}
        authenticated
        empty={<p>Vacío</p>}
        paging={{ username: "ana", kind: "following", total: 3, hasNext: false, nextCursor: null }}
        filters={{
          initial: { q: "", sort: "recent", segment: "all" },
          defaultSort: "recent",
          segmentCounts: { all: 3, mutual: 1, notBack: 2 },
        }}
        ownFollowing
      />,
    );
    await user.click(screen.getByRole("button", { name: /No te siguen/ }));
    expect(await screen.findByText("Nadie en este grupo.")).toBeInTheDocument();
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/users/ana/connections/following?sort=recent&segment=notBack",
      expect.anything(),
    );
  });
});
