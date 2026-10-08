import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), listJourneyArtistIds: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/artist-journeys/artist-journeys", () => ({
  listJourneyArtistIds: mocks.listJourneyArtistIds,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const a1 = "00000000-0000-4000-8000-0000000000a1";
const a2 = "00000000-0000-4000-8000-0000000000a2";
const call = (query: string) => GET(new NextRequest(`http://localhost/api/me/artist-journeys${query}`));

describe("GET /api/me/artist-journeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue(user);
  });

  it("devuelve los artistas con recorrido, sin caché", async () => {
    mocks.listJourneyArtistIds.mockResolvedValue([a1]);
    const response = await call(`?artistIds=${a1},${a2}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ journeyArtistIds: [a1] });
    expect(mocks.listJourneyArtistIds).toHaveBeenCalledWith(user.id, [a1, a2]);
  });

  it("quita duplicados", async () => {
    mocks.listJourneyArtistIds.mockResolvedValue([]);
    await call(`?artistIds=${a1},${a1}`);
    expect(mocks.listJourneyArtistIds).toHaveBeenCalledWith(user.id, [a1]);
  });

  it.each([
    ["sin parámetro", ""],
    ["vacío", "?artistIds="],
    ["un id que no es UUID", `?artistIds=${a1},xx`],
    ["más de 100 ids", `?artistIds=${Array.from({ length: 101 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`).join(",")}`],
  ])("responde 400 %s sin consultar", async (_name, query) => {
    const response = await call(query);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.listJourneyArtistIds).not.toHaveBeenCalled();
  });

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    const response = await call(`?artistIds=${a1}`);
    expect(response.status).toBe(401);
  });
});
