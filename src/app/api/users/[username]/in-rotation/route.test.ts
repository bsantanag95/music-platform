import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileInRotation: vi.fn(),
}));

vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/profiles/in-rotation", () => ({
  getProfileInRotation: mocks.getProfileInRotation,
}));

const ctx = { params: Promise.resolve({ username: "ana" }) };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/users/[username]/in-rotation", () => {
  it("devuelve la sección para el visitante de sesión", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    const inRotation = {
      songs: [{ id: "s1", title: "S1", artistName: "A" }],
      albums: [],
    };
    mocks.getProfileInRotation.mockResolvedValue(inRotation);

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inRotation });
    expect(mocks.getProfileInRotation).toHaveBeenCalledWith("ana", "viewer");
  });

  it("devuelve { inRotation: null } sin sesión y sin acceso", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getProfileInRotation.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ inRotation: null });
    expect(mocks.getProfileInRotation).toHaveBeenCalledWith("ana", null);
  });

  it("propaga 404 USER_NOT_FOUND cuando el perfil no existe", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getProfileInRotation.mockRejectedValue(
      new ApiError("USER_NOT_FOUND", 404, "Usuario no encontrado"),
    );

    const res = await GET(new Request("http://localhost"), ctx);
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "USER_NOT_FOUND" });
  });
});
