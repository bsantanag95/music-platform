import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ resolveSession: vi.fn(), getTasteFingerprint: vi.fn() }));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/profiles/stats", () => ({ getTasteFingerprint: mocks.getTasteFingerprint }));

const ctx = { params: Promise.resolve({ username: "ana" }) };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/users/[username]/fingerprint", () => {
  it("devuelve la huella para el visitante de sesión", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    const fingerprint = { ratingsVisible: true };
    mocks.getTasteFingerprint.mockResolvedValue(fingerprint);

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fingerprint });
    expect(mocks.getTasteFingerprint).toHaveBeenCalledWith("ana", "viewer");
  });

  it("devuelve { fingerprint: null } sin sesión y sin acceso", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getTasteFingerprint.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ fingerprint: null });
    expect(mocks.getTasteFingerprint).toHaveBeenCalledWith("ana", null);
  });
});
