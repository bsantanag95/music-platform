import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  listConnectionsPage: vi.fn(),
  relationsFor: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));
vi.mock("@/services/social/following", () => ({ listConnectionsPage: mocks.listConnectionsPage }));
vi.mock("@/services/social/relations", () => ({ relationsFor: mocks.relationsFor }));

const profile = { id: "owner", username: "ana", accessible: true, relation: "none" };
const leo = { id: "u1", username: "leo", displayName: null, profileVisibility: "public", avatarUrl: null };

function call(kind: string, query = "") {
  return GET(new NextRequest(`http://localhost/api/users/ana/connections/${kind}${query}`), {
    params: Promise.resolve({ username: "ana", kind }),
  });
}

describe("GET /api/users/{username}/connections/{kind}", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.getProfileByUsername.mockResolvedValue(profile);
    mocks.listConnectionsPage.mockResolvedValue({ users: [leo], hasNext: true });
    mocks.relationsFor.mockResolvedValue(new Map([["u1", "following"]]));
  });

  it("trae la página siguiente por cursor con la relación del visitante", async () => {
    const response = await call("followers", "?after=kim");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ users: [{ ...leo, relation: "following" }], hasNext: true });
    expect(mocks.listConnectionsPage).toHaveBeenCalledWith("owner", "followers", { after: "kim" });
    expect(mocks.relationsFor).toHaveBeenCalledWith("viewer", ["u1"]);
  });

  it("sin sesión la relación es none", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.relationsFor.mockResolvedValue(new Map());
    const body = await (await call("following")).json();
    expect(body.users[0].relation).toBe("none");
    expect(mocks.listConnectionsPage).toHaveBeenCalledWith("owner", "following", { after: null });
  });

  it("sin acceso al perfil: lista vacía sin consultar", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...profile, accessible: false });
    expect(await (await call("followers")).json()).toEqual({ users: [], hasNext: false });
    expect(mocks.listConnectionsPage).not.toHaveBeenCalled();
  });

  it("un listado desconocido es VALIDATION_ERROR", async () => {
    const response = await call("mutual");
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
  });
});
