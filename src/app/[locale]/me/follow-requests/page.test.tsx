import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import FollowRequestsPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mocks = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  getOwnProfile: vi.fn(),
  listFollowRequestsPage: vi.fn(),
  listSentRequestsPage: vi.fn(),
  countPendingFollowRequests: vi.fn(),
  countSentRequests: vi.fn(),
}));
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: () => mocks.requirePageUser() }));
vi.mock("@/services/social/profiles", () => ({ getOwnProfile: (...a: unknown[]) => mocks.getOwnProfile(...a) }));
vi.mock("@/services/social/following", () => ({
  listFollowRequestsPage: (...a: unknown[]) => mocks.listFollowRequestsPage(...a),
  listSentRequestsPage: (...a: unknown[]) => mocks.listSentRequestsPage(...a),
  countPendingFollowRequests: (...a: unknown[]) => mocks.countPendingFollowRequests(...a),
  countSentRequests: (...a: unknown[]) => mocks.countSentRequests(...a),
}));
vi.mock("@/services/social/follow-request-context", () => ({
  withFollowRequestContext: (_owner: string, page: unknown) => Promise.resolve(page),
}));
vi.mock("@/components/social/SentRequestList", () => ({
  SentRequestList: ({ initial, empty }: { initial: { users: unknown[] }; empty: ReactNode }) => (
    <div data-testid="sent" data-count={initial.users.length}>
      {initial.users.length === 0 ? empty : null}
    </div>
  ),
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
    mocks.listSentRequestsPage.mockResolvedValue(empty);
    mocks.countPendingFollowRequests.mockResolvedValue(0);
    mocks.countSentRequests.mockResolvedValue(2);
  });

  function run(tab?: string) {
    return FollowRequestsPage({ searchParams: Promise.resolve(tab ? { tab } : {}) });
  }

  it("migas hacia el perfil, título y la bandeja del usuario", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: "Ana", profileVisibility: "private" });
    const { getByRole, getByText } = render(await run());
    expect(getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/users/ana");
    expect(getByRole("heading", { level: 1 })).toHaveTextContent("requestsTitle");
    expect(getByText("requests.subtitle")).toBeInTheDocument();
    expect(mocks.listFollowRequestsPage).toHaveBeenCalledWith("me");
  });

  it("perfil público sin solicitudes: explica por qué y enlaza a la privacidad", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: null, profileVisibility: "public" });
    const { getByText, getByRole, queryByText } = render(await run());
    expect(getByText("requests.emptyPublicTitle")).toBeInTheDocument();
    expect(queryByText("requests.subtitle")).toBeNull();
    expect(getByRole("link", { name: "requests.emptyPublicCta" })).toHaveAttribute("href", "/me/settings/privacy");
  });

  it("perfil privado sin solicitudes: enlaza a tus seguidores", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: null, profileVisibility: "private" });
    const { getByRole } = render(await run());
    expect(getByRole("link", { name: "requests.emptyPrivateCta" })).toHaveAttribute(
      "href",
      "/users/ana/connections/followers",
    );
  });

  it("metadata con el título de la página", async () => {
    await expect(generateMetadata()).resolves.toEqual({ title: "requestsTitle" });
  });
  it("pestañas con cifras; Recibidas por defecto", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: null, profileVisibility: "private" });
    mocks.countPendingFollowRequests.mockResolvedValue(5);
    const { getByRole, getByTestId, queryByTestId } = render(await run());
    expect(getByRole("link", { name: /requests.tab.received\s*5/ })).toHaveAttribute("aria-current", "page");
    expect(getByRole("link", { name: /requests.tab.sent\s*2/ })).toHaveAttribute("href", "/me/follow-requests?tab=sent");
    expect(getByTestId("list")).toBeInTheDocument();
    expect(queryByTestId("sent")).toBeNull();
    expect(mocks.listSentRequestsPage).not.toHaveBeenCalled();
  });

  it("?tab=sent muestra las enviadas", async () => {
    mocks.getOwnProfile.mockResolvedValue({ username: "ana", displayName: null, profileVisibility: "public" });
    const { getByTestId, queryByTestId, getByText, getByRole } = render(await run("sent"));
    expect(getByTestId("sent")).toBeInTheDocument();
    expect(queryByTestId("list")).toBeNull();
    expect(getByText("requests.emptySentTitle")).toBeInTheDocument();
    expect(getByRole("link", { name: /requests.tab.sent/ })).toHaveAttribute("aria-current", "page");
    expect(mocks.listFollowRequestsPage).not.toHaveBeenCalled();
  });
});
