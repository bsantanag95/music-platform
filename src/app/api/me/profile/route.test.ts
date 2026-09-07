import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getOwnProfile: vi.fn(),
  updateProfileVisibility: vi.fn(),
  updateIdentity: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/social/profiles", () => ({
  getOwnProfile: mocks.getOwnProfile,
  updateProfileVisibility: mocks.updateProfileVisibility,
}));
vi.mock("@/services/profiles/identity", () => ({ updateIdentity: mocks.updateIdentity }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const ownProfile = {
  id: user.id,
  username: "ana",
  displayName: null,
  email: "ana@example.com",
  profileVisibility: "public",
};

function req(body: unknown) {
  return new NextRequest("http://localhost/api/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.getOwnProfile.mockResolvedValue(ownProfile);
});

describe("PATCH /api/me/profile", () => {
  it("actualiza solo la identidad", async () => {
    const res = await PATCH(req({ bio: "  Colecciono casetes  ", pronouns: "elle" }));
    expect(res.status).toBe(200);
    expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, {
      bio: "Colecciono casetes",
      pronouns: "elle",
    });
    expect(mocks.updateProfileVisibility).not.toHaveBeenCalled();
  });

  it("actualiza solo la visibilidad", async () => {
    await PATCH(req({ profileVisibility: "private" }));
    expect(mocks.updateProfileVisibility).toHaveBeenCalledWith(user.id, "private");
    expect(mocks.updateIdentity).not.toHaveBeenCalled();
  });

  it("acepta visibilidad e identidad a la vez", async () => {
    await PATCH(req({ profileVisibility: "private", location: "Rosario" }));
    expect(mocks.updateProfileVisibility).toHaveBeenCalledWith(user.id, "private");
    expect(mocks.updateIdentity).toHaveBeenCalledWith(user.id, { location: "Rosario" });
  });

  it("rechaza un body vacío con VALIDATION_ERROR", async () => {
    const res = await PATCH(req({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza una bio demasiado larga", async () => {
    const res = await PATCH(req({ bio: "x".repeat(201) }));
    expect(res.status).toBe(400);
    expect(mocks.updateIdentity).not.toHaveBeenCalled();
  });
});
