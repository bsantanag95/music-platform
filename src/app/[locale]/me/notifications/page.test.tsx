import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { NotificationsResponse } from "@/lib/api/schemas";
import NotificationsPage from "./page";

const mocks = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  listNotificationGroups: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getTimeZone: vi.fn().mockResolvedValue("America/Santiago"),
}));
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: mocks.requirePageUser }));
vi.mock("@/services/notifications/read", () => ({
  listNotificationGroups: mocks.listNotificationGroups,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/notifications/NotificationsView", () => ({
  NotificationsView: ({ initial }: { initial: NotificationsResponse }) => (
    <div data-testid="view" data-groups={initial.groups.length} data-cursor={initial.nextCursor ?? ""} />
  ),
}));

const emptyPage: NotificationsResponse = { groups: [], nextCursor: null };

describe("/me/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUser.mockResolvedValue({ id: "u1", username: "ana" });
    mocks.listNotificationGroups.mockResolvedValue(emptyPage);
  });

  it("exige sesión y carga la primera página en la zona del usuario", async () => {
    render(await NotificationsPage());

    expect(mocks.requirePageUser).toHaveBeenCalled();
    expect(mocks.listNotificationGroups).toHaveBeenCalledWith("u1", {
      timeZone: "America/Santiago",
    });
  });

  it("muestra el título, el subtítulo y el enlace a los ajustes de notificaciones", async () => {
    render(await NotificationsPage());

    expect(screen.getByRole("heading", { level: 1, name: "page.title" })).toBeInTheDocument();
    expect(screen.getByText("page.subtitle")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "page.settings" })).toHaveAttribute(
      "href",
      "/me/settings/notifications",
    );
  });

  it("pasa al cliente la página y su cursor tal cual", async () => {
    mocks.listNotificationGroups.mockResolvedValue({
      groups: [
        {
          id: "thread:root-1",
          kind: "comment_reply",
          lastAt: "2026-10-20T12:00:00.000Z",
          unread: true,
          eventCount: 1,
          actorCount: 1,
          actors: [{ id: "u2", username: "bruno", displayName: "Bruno", avatarUrl: null }],
          target: { type: "artist", artistId: "a-1", artistName: "Pink Floyd", rootId: "root-1" },
        },
      ],
      nextCursor: "2026-10-20T12:00:00.000Z|thread:root-1",
    });

    render(await NotificationsPage());

    const view = screen.getByTestId("view");
    expect(view).toHaveAttribute("data-groups", "1");
    expect(view).toHaveAttribute("data-cursor", "2026-10-20T12:00:00.000Z|thread:root-1");
  });
});
