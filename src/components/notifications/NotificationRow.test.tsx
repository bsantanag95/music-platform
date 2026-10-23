import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { artistHref } from "@/lib/catalog-links";
import type { NotificationGroupValue } from "@/lib/api/schemas";
import { NotificationRow } from "./NotificationRow";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  markNotificationsRead: vi.fn().mockResolvedValue(undefined),
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
  usePathname: () => "/album/rg-1",
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: mocks.apiFetch,
}));

vi.mock("./api", () => ({
  markNotificationsRead: mocks.markNotificationsRead,
  markNotificationsSeen: vi.fn().mockResolvedValue(undefined),
  fetchNotificationCount: vi.fn(),
  fetchNotificationPage: vi.fn(),
}));

const ANA = { id: "u-ana", username: "ana", displayName: "Ana", avatarUrl: null };
const BRUNO = { id: "u-bruno", username: "bruno", displayName: "Bruno", avatarUrl: null };

function group(overrides: Partial<NotificationGroupValue>): NotificationGroupValue {
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

function renderRow(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>, "es", {
    timeZone: "America/Santiago",
  });
}

describe("NotificationRow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redacta una respuesta con dos personas y enlaza al artista", () => {
    renderRow(<NotificationRow group={group({ actorCount: 2, actors: [ANA, BRUNO] })} />);

    const link = screen.getByRole("link", {
      name: /Ana y Bruno respondieron a tu tema en Pink Floyd/,
    });
    expect(link).toHaveAttribute("href", artistHref("Pink Floyd", "a-1"));
  });

  it("resume los nombres y las personas que faltan cuando hay más de dos", () => {
    renderRow(<NotificationRow group={group({ actorCount: 4, actors: [ANA, BRUNO] })} />);

    expect(
      screen.getByText(/Ana, Bruno y 2 personas más respondieron a tu tema en Pink Floyd/),
    ).toBeInTheDocument();
  });

  it("usa el username cuando no hay nombre visible", () => {
    renderRow(
      <NotificationRow
        group={group({
          kind: "new_follower",
          actors: [{ ...BRUNO, displayName: null }],
          target: { type: "profile", username: "bruno" },
        })}
      />,
    );

    expect(screen.getByRole("link", { name: /bruno te empezó a seguir/ })).toHaveAttribute(
      "href",
      "/users/bruno",
    );
  });

  it("la moderación no enlaza y muestra el motivo sin nombrar al moderador", () => {
    renderRow(
      <NotificationRow
        group={group({
          kind: "moderation",
          actors: [],
          actorCount: 0,
          target: { type: "moderation", action: "hide", contentType: "review", reason: "spam" },
        })}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Se ocultó tu reseña")).toBeInTheDocument();
    expect(screen.getByText("Motivo: spam")).toBeInTheDocument();
  });

  it("marca la entrada como leída al abrir su destino", async () => {
    const onRead = vi.fn();
    renderRow(<NotificationRow group={group({})} onRead={onRead} />);

    await userEvent.click(screen.getByRole("link", { name: /a tu tema en Pink Floyd/ }));

    expect(onRead).toHaveBeenCalled();
    await waitFor(() =>
      expect(mocks.markNotificationsRead).toHaveBeenCalledWith(
        { groupKeys: ["thread:root-1"] },
        "America/Santiago",
      ),
    );
  });

  it("no vuelve a marcar como leída una entrada ya leída", async () => {
    renderRow(<NotificationRow group={group({ unread: false })} />);

    await userEvent.click(screen.getByRole("link", { name: /a tu tema en Pink Floyd/ }));

    expect(mocks.markNotificationsRead).not.toHaveBeenCalled();
  });

  it("aprueba una solicitud y avisa para que la entrada desaparezca", async () => {
    mocks.apiFetch.mockResolvedValue(undefined);
    const onResolved = vi.fn();
    renderRow(
      <NotificationRow
        group={group({
          kind: "follow_request",
          id: "follow:f-1",
          target: { type: "profile", username: "bruno" },
        })}
        onResolved={onResolved}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/follow-requests/u-bruno/approve",
      expect.anything(),
      { method: "POST" },
    );
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });

  it("rechaza una solicitud y muestra el error localizado si falla", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mocks.apiFetch.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "no"));
    renderRow(
      <NotificationRow
        group={group({
          kind: "follow_request",
          id: "follow:f-1",
          target: { type: "profile", username: "bruno" },
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/follow-requests/u-bruno/reject",
      expect.anything(),
      { method: "POST" },
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar la solicitud. Intenta de nuevo en un momento.",
    );
  });

  it("anuncia las entradas sin leer a lectores de pantalla", () => {
    const { unmount } = renderRow(<NotificationRow group={group({})} />);
    expect(screen.getByText("(Sin leer)")).toBeInTheDocument();
    unmount();

    renderRow(<NotificationRow group={group({ unread: false })} />);
    expect(screen.queryByText("(Sin leer)")).not.toBeInTheDocument();
  });
});
