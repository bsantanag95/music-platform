import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ resolveSession: vi.fn(), getProfileAffinity: vi.fn() }));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/profiles/affinity", () => ({ getProfileAffinity: mocks.getProfileAffinity }));

const ctx = { params: Promise.resolve({ username: "ana" }) };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/users/[username]/affinity", () => {
  it("devuelve la afinidad para el visitante de sesión", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    const affinity = { sharedFavorites: [], sharedHighRatings: [], mutualFollowers: 2 };
    mocks.getProfileAffinity.mockResolvedValue(affinity);

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ affinity });
    expect(mocks.getProfileAffinity).toHaveBeenCalledWith("ana", "viewer");
  });

  it("devuelve { affinity: null } sin sesión", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getProfileAffinity.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), ctx);
    expect(await res.json()).toEqual({ affinity: null });
    expect(mocks.getProfileAffinity).toHaveBeenCalledWith("ana", null);
  });
});
