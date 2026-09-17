import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getIdentityCardPreview: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/services/profiles/identity-preview", () => ({
  getIdentityCardPreview: mocks.getIdentityCardPreview,
}));

const ctx = { params: Promise.resolve({ username: "ana" }) };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/users/[username]/identity-card-preview", () => {
  it("devuelve la previsualización para un visitante con sesión", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer" });
    const preview = {
      username: "ana",
      displayName: "Ana",
      accessible: true,
      identityCard: { artist: null, album: null, anthem: null },
    };
    mocks.getIdentityCardPreview.mockResolvedValue(preview);

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ preview });
    expect(mocks.getIdentityCardPreview).toHaveBeenCalledWith("ana", "viewer");
  });

  it("resuelve el viewer a null sin sesión", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getIdentityCardPreview.mockResolvedValue({
      username: "ana",
      displayName: null,
      accessible: false,
      identityCard: null,
    });

    await GET(new Request("http://localhost"), ctx);
    expect(mocks.getIdentityCardPreview).toHaveBeenCalledWith("ana", null);
  });

  it("propaga 404 USER_NOT_FOUND cuando el perfil no existe", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getIdentityCardPreview.mockRejectedValue(
      new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado"),
    );

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
