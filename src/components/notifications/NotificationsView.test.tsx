import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { NotificationGroupValue, NotificationsResponse } from "@/lib/api/schemas";
import { NotificationsView } from "./NotificationsView";
import { NOTIFICATIONS_COUNT_KEY } from "./query-keys";

const mocks = vi.hoisted(() => ({
  fetchNotificationPage: vi.fn(),
  markNotificationsRead: vi.fn(),
  markNotificationsSeen: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        // jsdom no implementa la navegación entre documentos.
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

vi.mock("./api", () => ({
  fetchNotificationPage: mocks.fetchNotificationPage,
  markNotificationsRead: mocks.markNotificationsRead,
  markNotificationsSeen: mocks.markNotificationsSeen,
}));

const BRUNO = { id: "u-bruno", username: "bruno", displayName: "Bruno", avatarUrl: null };

function entry(overrides: Partial<NotificationGroupValue> = {}): NotificationGroupValue {
  return {
    id: "thread:root-1",
    kind: "comment_reply",
    lastAt: "2026-10-20T12:00:00.000Z",
    unread: true,
    eventCount: 1,
    actorCount: 1,
    actors: [BRUNO],
    target: { type: "artist", artistId: "a-1", artistName: "Pink Floyd", rootId: "root-1" },
    ...overrides,
  };
}

function page(groups: NotificationGroupValue[], nextCursor: string | null = null): NotificationsResponse {
  return { groups, nextCursor };
}

function renderView(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = renderWithIntl(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
    "es",
    { timeZone: "America/Santiago" },
  );
  return { client, ...view };
}

describe("NotificationsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.markNotificationsSeen.mockResolvedValue(undefined);
    mocks.markNotificationsRead.mockResolvedValue(undefined);
  });

  it("siembra la primera página del servidor y marca la bandeja como vista", async () => {
    const { client } = renderView(
      <NotificationsView
        initial={page([
          entry(),
          entry({ id: "follow:f-1", kind: "new_follower", target: { type: "profile", username: "bruno" } }),
        ])}
      />,
    );

    expect(screen.getByText(/respondió a tu tema en Pink Floyd/)).toBeInTheDocument();
    expect(screen.getByText(/te empezó a seguir/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.markNotificationsSeen).toHaveBeenCalledTimes(1));
    // Abrir la página pone el contador a cero, pero no marca las entradas como leídas.
    expect(client.getQueryData(NOTIFICATIONS_COUNT_KEY)).toEqual({ count: 0 });
    expect(mocks.markNotificationsRead).not.toHaveBeenCalled();
    // Sin cursor no se ofrece "Cargar más".
    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });

  it("carga más con el cursor y la zona del usuario, y oculta el botón al agotarse", async () => {
    mocks.fetchNotificationPage.mockResolvedValue(
      page([entry({ id: "thread:root-2", target: { type: "artist", artistId: "a-2", artistName: "Otra", rootId: "root-2" } })]),
    );
    renderView(<NotificationsView initial={page([entry()], "cursor-1")} />);

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(mocks.fetchNotificationPage).toHaveBeenCalledWith({
      cursor: "cursor-1",
      timeZone: "America/Santiago",
    });
    expect(await screen.findByText(/en Otra/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument(),
    );
  });

  it("muestra el error de la página si 'Cargar más' falla y deja reintentar", async () => {
    mocks.fetchNotificationPage.mockRejectedValue(new Error("boom"));
    renderView(<NotificationsView initial={page([entry()], "cursor-1")} />);

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las notificaciones.",
    );
    expect(screen.getByRole("button", { name: "Cargar más" })).toBeEnabled();
  });

  it("marca todas como leídas con la zona y deja el botón sin efecto", async () => {
    const { client } = renderView(
      <NotificationsView initial={page([entry(), entry({ id: "follow:f-1", kind: "new_follower", target: { type: "profile", username: "bruno" } })])} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));

    expect(mocks.markNotificationsRead).toHaveBeenCalledWith(
      { all: true },
      "America/Santiago",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Marcar todas como leídas" })).toBeDisabled(),
    );
    expect(screen.queryByText(/Sin leer/)).not.toBeInTheDocument();
    expect(client.getQueryData(NOTIFICATIONS_COUNT_KEY)).toEqual({ count: 0 });
  });

  it("si 'Marcar todas' falla conserva las entradas sin leer y avisa", async () => {
    mocks.markNotificationsRead.mockRejectedValue(new Error("boom"));
    renderView(<NotificationsView initial={page([entry()])} />);

    await userEvent.click(screen.getByRole("button", { name: "Marcar todas como leídas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo completar la acción.");
    expect(screen.getByText(/Sin leer/)).toBeInTheDocument();
  });

  it("vacío: explica qué aparecerá aquí", () => {
    renderView(<NotificationsView initial={page([])} />);

    expect(screen.getByRole("heading", { name: "Aquí verás tus notificaciones" })).toBeInTheDocument();
    expect(
      screen.getByText(/Cuando alguien responda a tus temas, te siga o haya un aviso/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Sin leer/)).not.toBeInTheDocument();
  });

  it("una entrada leída al abrirla deja de mostrar el punto", async () => {
    renderView(<NotificationsView initial={page([entry()])} />);

    await userEvent.click(screen.getByRole("link", { name: /a tu tema en Pink Floyd/ }));

    await waitFor(() => expect(screen.queryByText(/Sin leer/)).not.toBeInTheDocument());
  });
});
