import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileFollowersPage from "./page";

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
  listFollowers: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/social/following", () => ({
  listFollowers: (...a: unknown[]) => mocks.listFollowers(...a),
}));
vi.mock("@/components/profiles/ProfileConnectionsHeader", () => ({
  ProfileConnectionsHeader: () => <div data-testid="header" />,
}));
vi.mock("@/components/profiles/ConnectionsUserList", () => ({
  ConnectionsUserList: ({ users }: { users: unknown[] }) => <div data-testid="list">{users.length}</div>,
}));

const accessibleProfile = {
  id: "owner",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "private",
  relation: "following",
  blockedByMe: false,
  accessible: true,
};

function run(username = "ana") {
  return ProfileFollowersPage({ params: Promise.resolve({ username }) });
}

describe("ProfileFollowersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil privado con seguidor aprobado: sí renderiza el listado de seguidores", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listFollowers.mockResolvedValue({ users: [{ id: "u1" }], page: 1, pageSize: 50, hasNext: false });

    const { findByTestId } = render(await run());
    expect((await findByTestId("list")).textContent).toBe("1");
    expect(mocks.listFollowers).toHaveBeenCalledWith("owner", 1, 50);
  });

  it("perfil privado sin acceso: no consulta el listado", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, relation: "none", accessible: false });

    const { queryByTestId } = render(await run());
    expect(queryByTestId("list")).toBeNull();
    expect(mocks.listFollowers).not.toHaveBeenCalled();
  });
});
