import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { NotificationGroupValue, NotificationsResponse } from "@/lib/api/schemas";
import { NotificationBell } from "./NotificationBell";

const mocks = vi.hoisted(() => ({
  fetchNotificationCount: vi.fn(),
  fetchNotificationPage: vi.fn(),
  markNotificationsSeen: vi.fn().mockResolvedValue(undefined),
  markNotificationsRead: vi.fn().mockResolvedValue(undefined),
  apiFetch: vi.fn(),
  pathname: "/album/rg-1",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
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
  usePathname: () => mocks.pathname,
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: mocks.apiFetch,
}));

vi.mock("./api", () => ({
  fetchNotificationCount: mocks.fetchNotificationCount,
  fetchNotificationPage: mocks.fetchNotificationPage,
  markNotificationsSeen: mocks.markNotificationsSeen,
  markNotificationsRead: mocks.markNotificationsRead,
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

function page(groups: NotificationGroupValue[]): NotificationsResponse {
  return { groups, nextCursor: null };
}

function renderBell(ui: React.ReactElement) {
  // Igual que `Providers`: `staleTime` de 60 s, así el contador sembrado por el
  // servidor no se pide de nuevo al montar (D7).
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>, "es", {
    timeZone: "America/Santiago",
  });
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchNotificationCount.mockResolvedValue({ count: 0 });
    mocks.fetchNotificationPage.mockResolvedValue(page([]));
  });

  it("tope visible 9+ y etiqueta accesible con la cifra", () => {
    renderBell(<NotificationBell initialCount={12} />);

    expect(screen.getByRole("button", { name: "Notificaciones, 12 sin ver" })).toBeInTheDocument();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("sin pendientes no hay insignia y la etiqueta es la simple", () => {
    renderBell(<NotificationBell initialCount={0} />);

    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeInTheDocument();
    expect(screen.queryByText("9+")).not.toBeInTheDocument();
  });

  it("abre el panel, marca visto y muestra las entradas más recientes", async () => {
    mocks.fetchNotificationPage.mockResolvedValue(page([entry()]));
    renderBell(<NotificationBell initialCount={1} />);

    await userEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));

    expect(mocks.markNotificationsSeen).toHaveBeenCalled();
    expect(
      await screen.findByText(/respondió a tu tema en Pink Floyd/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas" })).toHaveAttribute(
      "href",
      "/me/notifications",
    );
    // Abrir pone el contador a cero, pero no marca las entradas como leídas.
    expect(screen.getByRole("button", { name: "Notificaciones" })).toBeInTheDocument();
    expect(mocks.markNotificationsRead).not.toHaveBeenCalled();
  });

  it("cierra el panel con Escape y devuelve el foco al disparador", async () => {
    renderBell(<NotificationBell initialCount={0} />);
    const trigger = screen.getByRole("button", { name: "Notificaciones" });

    await userEvent.click(trigger);
    expect(screen.getByRole("link", { name: "Ver todas" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("link", { name: "Ver todas" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("muestra el estado vacío cuando no hay entradas", async () => {
    renderBell(<NotificationBell initialCount={0} />);

    await userEvent.click(screen.getByRole("button", { name: "Notificaciones" }));

    expect(
      await screen.findByText("Aquí verás respuestas, seguidores y avisos de tu cuenta."),
    ).toBeInTheDocument();
  });

  it("marca todas como leídas y deja el contador en cero", async () => {
    mocks.fetchNotificationPage.mockResolvedValue(page([entry()]));
    renderBell(<NotificationBell initialCount={1} />);

    await userEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Marcar todas como leídas" }),
    );

    expect(mocks.markNotificationsRead).toHaveBeenCalledWith({ all: true }, "America/Santiago");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Marcar todas como leídas" }),
      ).toBeDisabled(),
    );
  });

  it("muestra el error del panel si el listado falla", async () => {
    mocks.fetchNotificationPage.mockRejectedValue(new Error("boom"));
    renderBell(<NotificationBell initialCount={1} />);

    await userEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las notificaciones.",
    );
  });

  it("en móvil es un enlace a la página, no un panel", () => {
    renderBell(<NotificationBell initialCount={3} variant="mobile" />);

    const link = screen.getByRole("link", { name: "Notificaciones, 3 sin ver" });
    expect(link).toHaveAttribute("href", "/me/notifications");
    expect(screen.queryByText("Ver todas")).not.toBeInTheDocument();
  });
});
