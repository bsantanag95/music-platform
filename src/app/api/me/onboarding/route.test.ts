import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  completeOnboarding: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/onboarding/onboarding", () => ({
  completeOnboarding: mocks.completeOnboarding,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const rg = (n: number) => `00000000-0000-4000-8000-0000000000a${n}`;

function post(body: unknown) {
  return new NextRequest("http://localhost/api/me/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.completeOnboarding.mockResolvedValue({ albumFavorites: [], onboardedAt: "2026-09-09T00:00:00.000Z" });
});

describe("POST /api/me/onboarding", () => {
  it("cierra el onboarding y devuelve el estado", async () => {
    mocks.completeOnboarding.mockResolvedValue({
      albumFavorites: [
        { id: "p1", favoriteId: "f1", position: 1, target: { id: rg(1), title: "A", artistName: null, coverThumbUrl: null } },
      ],
      onboardedAt: "2026-09-09T00:00:00.000Z",
    });
    const res = await POST(post({ albumReleaseGroupIds: [rg(1)] }));
    expect(res.status).toBe(200);
    expect(mocks.completeOnboarding).toHaveBeenCalledWith(user.id, [rg(1)]);
    expect((await res.json()).albumFavorites).toHaveLength(1);
  });

  it("acepta lista vacía (saltar)", async () => {
    const res = await POST(post({ albumReleaseGroupIds: [] }));
    expect(res.status).toBe(200);
    expect(mocks.completeOnboarding).toHaveBeenCalledWith(user.id, []);
  });

  it("rechaza más de 6 ids antes de tocar el servicio", async () => {
    const res = await POST(post({ albumReleaseGroupIds: Array.from({ length: 7 }, (_, i) => rg(i)) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it("rechaza un id no-UUID", async () => {
    const res = await POST(post({ albumReleaseGroupIds: ["nope"] }));
    expect(res.status).toBe(400);
    expect(mocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it("propaga AUTH_REQUIRED sin sesión", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const res = await POST(post({ albumReleaseGroupIds: [] }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("propaga VALIDATION_ERROR del servicio (álbum inexistente)", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.completeOnboarding.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", 400, "Alguno de los álbumes no existe"),
    );
    const res = await POST(post({ albumReleaseGroupIds: [rg(1)] }));
    expect(res.status).toBe(400);
  });
});
