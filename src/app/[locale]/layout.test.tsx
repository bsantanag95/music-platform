import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  header: vi.fn((props: { user: Record<string, unknown> | null }) => <div data-testid="header" data-user={JSON.stringify(props.user)} />),
  footer: vi.fn((props: { user: Record<string, unknown> | null }) => <div data-testid="footer" data-user={JSON.stringify(props.user)} />),
  resolveSession: vi.fn(),
}));

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "" }),
  Source_Serif_4: () => ({ variable: "" }),
  IBM_Plex_Mono: () => ({ variable: "" }),
}));
vi.mock("next-intl/server", () => ({ getMessages: vi.fn().mockResolvedValue({ common: { appName: "App", tagline: "Tagline" } }) }));
vi.mock("next-intl", () => ({ NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/components/layout/Header", () => ({ Header: mocks.header }));
vi.mock("@/components/layout/Footer", () => ({ Footer: mocks.footer }));
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

    expect(mocks.header).toHaveBeenCalledWith({ user: { id: "u1", username: "ana", displayName: "Ana" } }, undefined);
    const headerProps = mocks.header.mock.calls[0]?.[0] as { user: Record<string, unknown> };
    expect(headerProps.user).not.toHaveProperty("passwordHash");
    expect(headerProps.user).not.toHaveProperty("createdAt");

    // El Footer recibe el mismo usuario público que el Header.
    expect(mocks.footer).toHaveBeenCalledWith({ user: { id: "u1", username: "ana", displayName: "Ana" } }, undefined);
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
