import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { ConnectionsRail } from "./ConnectionsRail";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/social/FollowButton", () => ({
  FollowButton: ({ followLabel }: { followLabel?: string }) => <button type="button">{followLabel ?? "Seguir"}</button>,
}));

const mocks = vi.hoisted(() => ({ listConnectionsPage: vi.fn(), getMutualFollowersPreview: vi.fn() }));
vi.mock("@/services/social/following", () => ({
  listConnectionsPage: (...a: unknown[]) => mocks.listConnectionsPage(...a),
}));
vi.mock("@/services/profiles/affinity", () => ({
  getMutualFollowersPreview: (...a: unknown[]) => mocks.getMutualFollowersPreview(...a),
}));

const own = {
  id: "owner",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "public" as const,
  relation: "self" as const,
  blockedByMe: false,
  accessible: true,
};
const person = (id: string) => ({
  id,
  username: id,
  displayName: null,
  profileVisibility: "public",
  avatarUrl: null,
  followedAt: "2026-10-01T00:00:00.000Z",
});

describe("ConnectionsRail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tus Seguidores: Para seguir de vuelta, hasta 5, con enlace a ver todas", async () => {
    mocks.listConnectionsPage.mockResolvedValue({
      users: ["a", "b", "c", "d", "e"].map(person),
      hasNext: true,
      nextCursor: "x",
      total: 7,
    });
    const { getByText, getAllByRole, getByRole } = render(
      (await ConnectionsRail({ profile: own, kind: "followers", viewerId: "owner" }))!,
    );
    expect(mocks.listConnectionsPage).toHaveBeenCalledWith("owner", "followers", { segment: "notBack", limit: 5 });
    expect(getByText("railFollowBackTitle")).toBeInTheDocument();
    expect(getAllByRole("button", { name: "Seguir" })).toHaveLength(5);
    expect(getByRole("link", { name: /railSeeAll/ })).toHaveAttribute(
      "href",
      "/users/ana/connections/followers?segment=notBack",
    );
  });

  it("sin nadie para seguir de vuelta, o en tus Seguidos, no hay panel", async () => {
    mocks.listConnectionsPage.mockResolvedValue({ users: [], hasNext: false, nextCursor: null, total: 0 });
    expect(await ConnectionsRail({ profile: own, kind: "followers", viewerId: "owner" })).toBeNull();
    expect(await ConnectionsRail({ profile: own, kind: "following", viewerId: "owner" })).toBeNull();
  });

  it("perfil ajeno: seguidores en común con enlace a la pestaña", async () => {
    mocks.getMutualFollowersPreview.mockResolvedValue({ total: 3, first: person("leo") });
    const other = { ...own, relation: "following" as const };
    const { getByRole } = render((await ConnectionsRail({ profile: other, kind: "following", viewerId: "viewer" }))!);
    expect(mocks.getMutualFollowersPreview).toHaveBeenCalledWith("ana", "viewer");
    expect(getByRole("link", { name: "railInCommonLink" })).toHaveAttribute("href", "/users/ana/connections/mutual");
  });

  it("perfil ajeno sin sesión o sin coincidencias: nada", async () => {
    const other = { ...own, relation: "none" as const };
    expect(await ConnectionsRail({ profile: other, kind: "followers", viewerId: null })).toBeNull();
    mocks.getMutualFollowersPreview.mockResolvedValue(null);
    expect(await ConnectionsRail({ profile: other, kind: "followers", viewerId: "viewer" })).toBeNull();
  });
});
