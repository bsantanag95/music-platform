import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import FollowRequestsPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const mocks = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  getOwnProfile: vi.fn(),
  listFollowRequestsPage: vi.fn(),
}));
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: () => mocks.requirePageUser() }));
vi.mock("@/services/social/profiles", () => ({ getOwnProfile: (...a: unknown[]) => mocks.getOwnProfile(...a) }));
vi.mock("@/services/social/following", () => ({
  listFollowRequestsPage: (...a: unknown[]) => mocks.listFollowRequestsPage(...a),
}));
vi.mock("@/components/social/FollowRequestList", () => ({
  FollowRequestList: ({ initial, empty }: { initial: { users: unknown[] }; empty: ReactNode }) => (
    <div data-testid="list" data-count={initial.users.length}>
      {initial.users.length === 0 ? empty : null}
    </div>
  ),
}));

const empty = { users: [], hasNext: false, nextCursor: null, total: 0 };

describe("FollowRequestsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePageUser.mockResolvedValue({ id: "me" });
    mocks.listFollowRequestsPage.mockResolvedValue(empty);
  });

  it("migas hacia el perfil, título y la bandeja del usuario", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: "Ana", profileVisibility: "private" });
    const { getByRole, getByText } = render(await FollowRequestsPage());
    expect(getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/users/ana");
    expect(getByRole("heading", { level: 1 })).toHaveTextContent("requestsTitle");
    expect(getByText("requests.subtitle")).toBeInTheDocument();
    expect(mocks.listFollowRequestsPage).toHaveBeenCalledWith("me");
  });

  it("perfil público sin solicitudes: explica por qué y enlaza a la privacidad", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: null, profileVisibility: "public" });
    const { getByText, getByRole, queryByText } = render(await FollowRequestsPage());
    expect(getByText("requests.emptyPublicTitle")).toBeInTheDocument();
    expect(queryByText("requests.subtitle")).toBeNull();
    expect(getByRole("link", { name: "requests.emptyPublicCta" })).toHaveAttribute("href", "/me/settings/privacy");
  });

  it("perfil privado sin solicitudes: enlaza a tus seguidores", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: null, profileVisibility: "private" });
    const { getByRole } = render(await FollowRequestsPage());
    expect(getByRole("link", { name: "requests.emptyPrivateCta" })).toHaveAttribute(
      "href",
      "/users/ana/connections/followers",
    );
  });

  it("metadata con el título de la página", async () => {
    await expect(generateMetadata()).resolves.toEqual({ title: "requestsTitle" });
  });
});
