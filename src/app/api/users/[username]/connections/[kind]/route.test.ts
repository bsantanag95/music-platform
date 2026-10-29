import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  listConnectionsPage: vi.fn(),
  followersOf: vi.fn(),
  relationsFor: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));
vi.mock("@/services/social/following", () => ({
  listConnectionsPage: mocks.listConnectionsPage,
  followersOf: mocks.followersOf,
}));
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
    mocks.listConnectionsPage.mockResolvedValue({ users: [leo], hasNext: true, nextCursor: "abc", total: 7 });
    mocks.relationsFor.mockResolvedValue(new Map([["u1", "following"]]));
    mocks.followersOf.mockResolvedValue(new Set(["u1"]));
  });

  it("pasa filtros y cursor, y devuelve relación, si te sigue y el total", async () => {
    const response = await call("followers", "?q=jo&sort=name&cursor=xyz");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      users: [{ ...leo, relation: "following", followsYou: true }],
      hasNext: true,
      nextCursor: "abc",
      total: 7,
    });
    expect(mocks.listConnectionsPage).toHaveBeenCalledWith("owner", "followers", {
      q: "jo",
      sort: "name",
      segment: "all",
      cursor: "xyz",
    });
    expect(mocks.followersOf).toHaveBeenCalledWith("viewer", ["u1"]);
  });

  it("orden por defecto: Nombre en los Seguidos de un perfil ajeno, Recientes en Seguidores", async () => {
    await call("following");
    expect(mocks.listConnectionsPage).toHaveBeenLastCalledWith("owner", "following", expect.objectContaining({ sort: "name" }));
    await call("followers");
    expect(mocks.listConnectionsPage).toHaveBeenLastCalledWith("owner", "followers", expect.objectContaining({ sort: "recent" }));
  });

  it("el segmento solo aplica al dueño", async () => {
    await call("followers", "?segment=notBack");
    expect(mocks.listConnectionsPage).toHaveBeenLastCalledWith("owner", "followers", expect.objectContaining({ segment: "all" }));

    mocks.getProfileByUsername.mockResolvedValue({ ...profile, relation: "self" });
    await call("following", "?segment=notBack");
    expect(mocks.listConnectionsPage).toHaveBeenLastCalledWith(
      "owner",
      "following",
      expect.objectContaining({ segment: "notBack", sort: "recent" }),
    );
  });

  it("sin sesión la relación es none y nadie te sigue", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.relationsFor.mockResolvedValue(new Map());
    mocks.followersOf.mockResolvedValue(new Set());
    const body = await (await call("following")).json();
    expect(body.users[0]).toMatchObject({ relation: "none", followsYou: false });
  });

  it("sin acceso al perfil: lista vacía sin consultar", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...profile, accessible: false });
    expect(await (await call("followers")).json()).toEqual({ users: [], hasNext: false, nextCursor: null, total: 0 });
    expect(mocks.listConnectionsPage).not.toHaveBeenCalled();
  });

  it("un listado o un orden desconocido es VALIDATION_ERROR", async () => {
    expect((await call("mutual")).status).toBe(400);
    const response = await call("followers", "?sort=popular");
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
  });
});
