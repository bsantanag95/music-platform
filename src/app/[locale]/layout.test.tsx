import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  header: vi.fn((props: { user: Record<string, unknown> | null }) => <div data-testid="header" data-user={JSON.stringify(props.user)} />),
  footer: vi.fn((props: { user: Record<string, unknown> | null }) => <div data-testid="footer" data-user={JSON.stringify(props.user)} />),
  resolveSession: vi.fn(),
  countUnseen: vi.fn().mockResolvedValue(0),
  hasNewReleases: vi.fn().mockResolvedValue(false),
  getTimeZone: vi.fn().mockResolvedValue("America/Santiago"),
  getUserPermissions: vi.fn().mockResolvedValue([]),
}));

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "" }),
  Source_Serif_4: () => ({ variable: "" }),
  IBM_Plex_Mono: () => ({ variable: "" }),
}));
vi.mock("next-intl/server", () => ({
  getMessages: vi.fn().mockResolvedValue({ common: { appName: "App", tagline: "Tagline" } }),
  getTimeZone: mocks.getTimeZone,
}));
vi.mock("next-intl", () => ({ NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/auth/authorization", () => ({ getUserPermissions: mocks.getUserPermissions }));
vi.mock("@/services/storage/avatar-urls", () => ({ resolveImageUrl: async () => null }));
vi.mock("@/services/notifications/read", () => ({
  countUnseen: mocks.countUnseen,
  hasNewReleases: mocks.hasNewReleases,
}));
vi.mock("@/components/layout/Header", () => ({ Header: mocks.header }));
vi.mock("@/components/layout/Footer", () => ({ Footer: mocks.footer }));
vi.mock("@/components/layout/FooterSlot", () => ({
  FooterSlot: ({ full }: { full: React.ReactNode }) => <>{full}</>,
}));
vi.mock("./providers", () => ({ Providers: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import RootLayout from "./layout";

describe("RootLayout", () => {
  it("solo pasa al Header los campos públicos del usuario", async () => {
    mocks.resolveSession.mockResolvedValue({
      user: {
        id: "u1",
        username: "ana",
        email: "ana@example.com",
        displayName: "Ana",
        passwordHash: "secreto",
        createdAt: new Date("2026-01-01"),
      },
    });

    const layout = await RootLayout({ children: <main>Contenido</main>, params: Promise.resolve({ locale: "es" }) });
    render(layout);

    expect(mocks.header).toHaveBeenCalledWith(
      // `avatarUrl` resuelto aparte (null sin foto); nunca la fila completa del usuario.
      expect.objectContaining({ user: { id: "u1", username: "ana", displayName: "Ana", avatarUrl: null } }),
      undefined,
    );
    const headerProps = mocks.header.mock.calls[0]?.[0] as {
      user: Record<string, unknown>;
      notificationCount: number;
      newReleases: boolean;
    };
    expect(headerProps.user).not.toHaveProperty("passwordHash");
    expect(headerProps.user).not.toHaveProperty("createdAt");
    expect(headerProps.notificationCount).toBe(0);
    expect(headerProps.newReleases).toBe(false);
    expect(mocks.countUnseen).toHaveBeenCalledWith("u1", "America/Santiago");
    expect(mocks.hasNewReleases).toHaveBeenCalledWith("u1");

    // El Footer recibe el mismo usuario público que el Header, sin la foto.
    expect(mocks.footer).toHaveBeenCalledWith(
      expect.objectContaining({ user: { id: "u1", username: "ana", displayName: "Ana" } }),
      undefined,
    );
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
