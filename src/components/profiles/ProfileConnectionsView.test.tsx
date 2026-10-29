import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { connectionsMetadata, ProfileConnectionsView } from "./ProfileConnectionsView";

vi.mock("@/services/profiles/renamed-redirect", () => ({ redirectIfRenamed: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  listConnectionsPage: vi.fn(),
  getConnectionsSummary: vi.fn(),
  countConnectionSegments: vi.fn(),
  countPendingFollowRequests: vi.fn(),
  followersOf: vi.fn(),
  relationsFor: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/social/following", () => ({
  listConnectionsPage: (...a: unknown[]) => mocks.listConnectionsPage(...a),
  getConnectionsSummary: (...a: unknown[]) => mocks.getConnectionsSummary(...a),
  countConnectionSegments: (...a: unknown[]) => mocks.countConnectionSegments(...a),
  countPendingFollowRequests: (...a: unknown[]) => mocks.countPendingFollowRequests(...a),
  followersOf: (...a: unknown[]) => mocks.followersOf(...a),
}));
vi.mock("@/services/social/relations", () => ({
  relationsFor: (...a: unknown[]) => mocks.relationsFor(...a),
}));
vi.mock("@/components/social/FollowButton", () => ({
  FollowButton: ({ relation }: { relation: string }) => <button type="button">follow:{relation}</button>,
}));
vi.mock("./ProfileConnectionsHeader", () => ({
  ProfileConnectionsHeader: ({ counts, isOwn }: { counts: unknown; isOwn: boolean }) => (
    <div data-testid="header" data-counts={JSON.stringify(counts)} data-own={String(isOwn)} />
  ),
}));
vi.mock("./ConnectionsUserList", () => ({
  ConnectionsUserList: (props: {
    users: unknown[];
    ownRemovableFollowers?: boolean;
    ownFollowing?: boolean;
    paging?: unknown;
    filters?: unknown;
  }) => (
    <div
      data-testid="list"
      data-remove={String(Boolean(props.ownRemovableFollowers))}
      data-own-following={String(Boolean(props.ownFollowing))}
      data-paging={JSON.stringify(props.paging)}
      data-filters={JSON.stringify(props.filters)}
    >
      {props.users.length}
    </div>
  ),
}));

const profile = {
  id: "owner",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "private",
  relation: "following",
  blockedByMe: false,
  accessible: true,
};

describe("ProfileConnectionsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.relationsFor.mockResolvedValue(new Map());
    mocks.getConnectionsSummary.mockResolvedValue({ avatarUrl: null, followerCount: 80, followingCount: 3 });
    mocks.listConnectionsPage.mockResolvedValue({
      users: [{ id: "u1", username: "leo" }],
      hasNext: true,
      nextCursor: "c1",
      total: 80,
    });
    mocks.followersOf.mockResolvedValue(new Set(["u1"]));
    mocks.countConnectionSegments.mockResolvedValue({ all: 80, mutual: 30, notBack: 50 });
    mocks.countPendingFollowRequests.mockResolvedValue(0);
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(ProfileConnectionsView({ username: "ana", kind: "followers" })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("con acceso: cifras en la cabecera, primera página y paginación con el total de la pestaña", async () => {
    mocks.getProfileByUsername.mockResolvedValue(profile);
    const { getByTestId } = render(await ProfileConnectionsView({ username: "ana", kind: "followers" }));

    expect(getByTestId("header")).toHaveAttribute("data-counts", JSON.stringify({ followers: 80, following: 3 }));
    expect(mocks.listConnectionsPage).toHaveBeenCalledWith("owner", "followers", {
      q: "",
      sort: "recent",
      segment: "all",
    });
    expect(mocks.relationsFor).toHaveBeenCalledWith("viewer", ["u1"]);
    const list = getByTestId("list");
    expect(list).toHaveAttribute("data-remove", "false");
    expect(JSON.parse(list.getAttribute("data-paging")!)).toEqual({
      username: "ana",
      kind: "followers",
      total: 80,
      hasNext: true,
      nextCursor: "c1",
    });
    expect(JSON.parse(list.getAttribute("data-filters")!)).toEqual({
      initial: { q: "", sort: "recent", segment: "all" },
      defaultSort: "recent",
    });
    expect(mocks.countConnectionSegments).not.toHaveBeenCalled();
  });

  it("filtros de la URL: Seguidos ajenos por Nombre por defecto; el segmento se ignora si no es el dueño", async () => {
    mocks.getProfileByUsername.mockResolvedValue(profile);
    render(
      await ProfileConnectionsView({
        username: "ana",
        kind: "following",
        searchParams: { q: "jo", segment: "notBack", sort: "nope" },
      }),
    );
    expect(mocks.listConnectionsPage).toHaveBeenCalledWith("owner", "following", {
      q: "jo",
      sort: "name",
      segment: "all",
    });
  });

  it("dueño: segmentos con cifras y aviso de solicitudes pendientes en Seguidores", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...profile, relation: "self" });
    mocks.countPendingFollowRequests.mockResolvedValue(2);
    const { getByTestId, getByRole } = render(
      await ProfileConnectionsView({ username: "ana", kind: "followers", searchParams: { segment: "notBack" } }),
    );
    const filters = JSON.parse(getByTestId("list").getAttribute("data-filters")!);
    expect(filters.initial.segment).toBe("notBack");
    expect(filters.segmentCounts).toEqual({ all: 80, mutual: 30, notBack: 50 });
    expect(getByRole("link", { name: "connections.pendingRequestsLink" })).toHaveAttribute("href", "/me/follow-requests");
  });

  it("perfil privado sin acceso: sin cifras ni listado, con el botón para pedir seguir", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...profile, relation: "none", accessible: false });
    const { getByTestId, queryByTestId, getByRole } = render(
      await ProfileConnectionsView({ username: "ana", kind: "following" }),
    );

    expect(queryByTestId("list")).toBeNull();
    expect(getByTestId("header")).toHaveAttribute("data-counts", "null");
    expect(mocks.listConnectionsPage).not.toHaveBeenCalled();
    expect(getByRole("button", { name: "follow:none" })).toBeInTheDocument();
  });

  it("perfil privado sin sesión: no ofrece seguir", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getProfileByUsername.mockResolvedValue({ ...profile, relation: "none", accessible: false });
    const { queryByRole } = render(await ProfileConnectionsView({ username: "ana", kind: "following" }));
    expect(queryByRole("button")).toBeNull();
  });

  it("dueño en Seguidores: puede eliminar seguidores", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...profile, relation: "self" });
    const { getByTestId } = render(await ProfileConnectionsView({ username: "ana", kind: "followers" }));
    expect(getByTestId("list")).toHaveAttribute("data-remove", "true");
    expect(getByTestId("list")).toHaveAttribute("data-own-following", "false");
    expect(getByTestId("header")).toHaveAttribute("data-own", "true");
  });

  it("dueño en Seguidos: dejar de seguir quita la fila", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...profile, relation: "self" });
    const { getByTestId } = render(await ProfileConnectionsView({ username: "ana", kind: "following" }));
    expect(getByTestId("list")).toHaveAttribute("data-own-following", "true");
    expect(getByTestId("list")).toHaveAttribute("data-remove", "false");
  });

  it("metadata: pestaña y nombre del perfil", async () => {
    mocks.getProfileByUsername.mockResolvedValue(profile);
    await expect(connectionsMetadata("ana", "followersTab")).resolves.toEqual({
      title: "connections.followersTab · Ana",
    });
  });
});
