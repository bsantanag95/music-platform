import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Placa } from "./Placa";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars?.date ? `Miembro desde ${vars.date}` : key,
  ),
  getFormatter: vi.fn().mockResolvedValue({ dateTime: () => "septiembre de 2025" }),
}));

vi.mock("@/components/social/FollowButton", () => ({
  FollowButton: ({ relation }: { relation: string }) => (
    <div data-testid="follow-button">{relation}</div>
  ),
}));

vi.mock("@/components/social/BlockButton", () => ({
  BlockButton: () => <div data-testid="block-button" />,
}));

const base: ProfileView = {
  id: "u1",
  username: "ana",
  displayName: "Ana Torres",
  profileVisibility: "public",
  bio: null,
  pronouns: null,
  location: null,
  timezone: null,
  avatarUrl: null,
  memberSince: new Date("2025-09-15T00:00:00Z"),
  links: [],
  followerCount: 12,
  followingCount: 8,
  relation: "none",
  accessible: true,
  blockedByMe: false,
  isOwner: false,
};

describe("Placa", () => {
  it("vista pública: identidad, contadores y botón de seguir", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: true }));
    expect(screen.getByRole("heading", { name: "Ana Torres" })).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText(/Miembro desde/)).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveTextContent("none");
  });

  it("vista privada sin autorización: sigue mostrando bio, enlaces y contadores", async () => {
    renderWithIntl(
      await Placa({
        profile: {
          ...base,
          profileVisibility: "private",
          accessible: false,
          bio: "Colecciono ediciones japonesas.",
          pronouns: "elle",
          location: "Rosario",
          links: [{ id: "l1", kind: "bandcamp", url: "https://ana.bandcamp.com", position: 0 }],
        },
        authenticated: true,
      }),
    );
    expect(screen.getByText("Colecciono ediciones japonesas.")).toBeInTheDocument();
    expect(screen.getByText("elle")).toBeInTheDocument();
    expect(screen.getByText("Rosario")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "linkKind.bandcamp" })).toHaveAttribute(
      "href",
      "https://ana.bandcamp.com",
    );
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("vista del dueño: sin botón de bloqueo", async () => {
    renderWithIntl(
      await Placa({
        profile: { ...base, relation: "self", isOwner: true },
        authenticated: true,
      }),
    );
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveTextContent("self");
  });

  it("visitante anónimo: sin botón de bloqueo", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: false }));
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
  });

  it("otro usuario autenticado: muestra el botón de bloqueo", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: true }));
    expect(screen.getByTestId("block-button")).toBeInTheDocument();
  });
});
