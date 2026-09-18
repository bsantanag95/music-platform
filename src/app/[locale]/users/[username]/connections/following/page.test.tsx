import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileFollowingPage from "./page";

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
  listFollowing: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/social/following", () => ({
  listFollowing: (...a: unknown[]) => mocks.listFollowing(...a),
}));
vi.mock("@/components/profiles/ProfileConnectionsHeader", () => ({
  ProfileConnectionsHeader: ({ active, showMutualTab }: { active: string; showMutualTab: boolean }) => (
    <div data-testid="header" data-active={active} data-mutual={showMutualTab ? "true" : "false"} />
  ),
}));
vi.mock("@/components/profiles/ConnectionsUserList", () => ({
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
  return ProfileFollowingPage({ params: Promise.resolve({ username }) });
}

describe("ProfileFollowingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil accesible: renderiza el listado de seguidos", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listFollowing.mockResolvedValue({ users: [{ id: "u1" }, { id: "u2" }], page: 1, pageSize: 50, hasNext: false });

    const { findByTestId } = render(await run());
    expect((await findByTestId("list")).textContent).toBe("2");
    expect(mocks.listFollowing).toHaveBeenCalledWith("owner", 1, 50);
  });

  it("perfil no accesible: no consulta el listado, muestra aviso", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, accessible: false });

    const { queryByTestId } = render(await run());
    expect(queryByTestId("list")).toBeNull();
    expect(mocks.listFollowing).not.toHaveBeenCalled();
  });
});
