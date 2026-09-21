import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileMutualConnectionsPage from "./page";
vi.mock("@/services/profiles/renamed-redirect", () => ({ redirectIfRenamed: vi.fn().mockResolvedValue(undefined) }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  listMutualFollowers: vi.fn(),
  listMutualFollowing: vi.fn(),
  relationsFor: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/profiles/affinity", () => ({
  listMutualFollowers: (...a: unknown[]) => mocks.listMutualFollowers(...a),
  listMutualFollowing: (...a: unknown[]) => mocks.listMutualFollowing(...a),
}));
vi.mock("@/services/social/relations", () => ({
  relationsFor: (...a: unknown[]) => mocks.relationsFor(...a),
}));
vi.mock("@/components/profiles/ProfileConnectionsHeader", () => ({
  ProfileConnectionsHeader: ({ showMutualTab }: { showMutualTab: boolean }) => (
    <div data-testid="header" data-mutual={showMutualTab ? "true" : "false"} />
  ),
}));
vi.mock("@/components/profiles/ConnectionsUserList", () => ({
  ConnectionsSection: ({ heading, children }: { heading: string; children: React.ReactNode }) => (
    <section aria-label={heading}>{children}</section>
  ),
  ConnectionsUserList: ({ users }: { users: unknown[] }) => <div data-testid="list">{users.length}</div>,
}));

const accessibleProfile = {
  id: "owner",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "public",
  relation: "none",
  blockedByMe: false,
  accessible: true,
};

function run(username = "ana") {
  return ProfileMutualConnectionsPage({ params: Promise.resolve({ username }) });
}

describe("ProfileMutualConnectionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.relationsFor.mockResolvedValue(new Map());
  });

  it("perfil inexistente → notFound", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sin sesión: no consulta nada, muestra aviso de inicio de sesión", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);

    const { getByText, queryByTestId } = render(await run());
    expect(getByText("connections.mutualSignInHint")).toBeInTheDocument();
    expect(queryByTestId("list")).toBeNull();
    expect(mocks.listMutualFollowers).not.toHaveBeenCalled();
    expect(mocks.listMutualFollowing).not.toHaveBeenCalled();
  });

  it("propio perfil: no consulta nada, muestra aviso", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "owner" } });
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, relation: "self" });

    const { getByText } = render(await run());
    expect(getByText("connections.mutualSignInHint")).toBeInTheDocument();
    expect(mocks.listMutualFollowers).not.toHaveBeenCalled();
  });

  it("con sesión y perfil ajeno accesible: renderiza ambas secciones", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listMutualFollowing.mockResolvedValue({ users: [{ id: "a" }], totalCount: 1, page: 1, pageSize: 50, hasNext: false });
    mocks.listMutualFollowers.mockResolvedValue({ users: [{ id: "b" }, { id: "c" }], totalCount: 2, page: 1, pageSize: 50, hasNext: false });

    const { getAllByTestId } = render(await run());
    const lists = getAllByTestId("list");
    expect(lists).toHaveLength(2);
    expect(lists[0]?.textContent).toBe("1");
    expect(lists[1]?.textContent).toBe("2");
    expect(mocks.listMutualFollowing).toHaveBeenCalledWith("viewer", "owner", 1, 50);
    expect(mocks.listMutualFollowers).toHaveBeenCalledWith("viewer", "owner", 1, 50);
  });

  it("perfil no accesible: no consulta nada", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, accessible: false });

    const { queryByTestId } = render(await run());
    expect(queryByTestId("list")).toBeNull();
    expect(mocks.listMutualFollowers).not.toHaveBeenCalled();
    expect(mocks.listMutualFollowing).not.toHaveBeenCalled();
  });
});
