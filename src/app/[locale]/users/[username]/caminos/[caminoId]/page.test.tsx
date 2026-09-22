import { describe, expect, it, vi, beforeEach } from "vitest";
import UserCaminoDetailPage from "./page";

vi.mock("@/services/profiles/renamed-redirect", () => ({ redirectIfRenamed: vi.fn().mockResolvedValue(undefined) }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: (url: string) => redirect(url),
}));

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  getUserCaminoDetail: vi.fn(),
  savedStateFor: vi.fn(),
  listenedReleaseGroupIds: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/camino/camino", () => ({
  getUserCaminoDetail: (...a: unknown[]) => mocks.getUserCaminoDetail(...a),
}));
vi.mock("@/services/lists/saved-lists", () => ({
  savedStateFor: (...a: unknown[]) => mocks.savedStateFor(...a),
}));
vi.mock("@/services/journeys/progress", () => ({
  listenedReleaseGroupIds: (...a: unknown[]) => mocks.listenedReleaseGroupIds(...a),
}));
vi.mock("@/components/camino/CaminoReadView", () => ({ CaminoReadView: () => null }));

const CAMINO_ID = "a1b2c3d4-0000-4000-8000-000000000001";

function run(username = "ana", caminoId = CAMINO_ID) {
  return UserCaminoDetailPage({ params: Promise.resolve({ username, caminoId }) });
}

describe("UserCaminoDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.savedStateFor.mockResolvedValue(new Map());
    mocks.listenedReleaseGroupIds.mockResolvedValue(new Set());
    mocks.getProfileByUsername.mockResolvedValue({
      id: "owner-1",
      username: "ana",
      displayName: "Ana",
      relation: "none",
      profileVisibility: "public",
    });
  });

  it("id no uuid → notFound", async () => {
    await expect(run("ana", "no-uuid")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("dueño propio → redirige a /me/caminos/[id]", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "viewer",
      username: "ana",
      displayName: "Ana",
      relation: "self",
      profileVisibility: "public",
    });
    await expect(run()).rejects.toThrow(`NEXT_REDIRECT:/es/me/caminos/${CAMINO_ID}`);
  });

  it("Camino no visible → notFound", async () => {
    mocks.getUserCaminoDetail.mockRejectedValue({ code: "CAMINO_NOT_FOUND", constructor: { name: "ApiError" } });
    await expect(run()).rejects.toThrow();
  });

  it("Camino visible → renderiza sin lanzar", async () => {
    mocks.getUserCaminoDetail.mockResolvedValue({
      id: CAMINO_ID,
      title: "Shoegaze esencial",
      description: null,
      audience: "public",
      state: "in_progress",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      progress: { selectedCount: 2, listenedCount: 1 },
      albums: [],
    });
    await expect(run()).resolves.toBeDefined();
    expect(mocks.getUserCaminoDetail).toHaveBeenCalledWith(CAMINO_ID, "owner-1", ["public"]);
    expect(mocks.listenedReleaseGroupIds).not.toHaveBeenCalled();
  });

  it("con tracking activo, consulta el diario propio del visitante por álbum", async () => {
    const albumId = "b1b2c3d4-0000-4000-8000-000000000002";
    mocks.getUserCaminoDetail.mockResolvedValue({
      id: CAMINO_ID,
      title: "Shoegaze esencial",
      description: null,
      audience: "public",
      state: "in_progress",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      progress: { selectedCount: 1, listenedCount: 0 },
      albums: [{ id: albumId, title: "Loveless", artistName: "My Bloody Valentine", firstReleaseYear: 1991, coverThumbUrl: null, listened: false }],
    });
    mocks.savedStateFor.mockResolvedValue(new Map([[CAMINO_ID, { saved: true, following: false, tracking: true }]]));

    await expect(run()).resolves.toBeDefined();
    expect(mocks.listenedReleaseGroupIds).toHaveBeenCalledWith("viewer", [albumId]);
  });
});
