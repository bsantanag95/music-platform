import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listMyRatings: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/ratings/my-ratings", () => ({
  listMyRatings: mocks.listMyRatings,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };

const listResult = {
  items: [],
  page: 1,
  pageSize: 20,
  hasNext: false,
  total: 0,
  counts: { "release-group": 0, recording: 0 },
  facets: { years: [] },
};

describe("GET /api/me/ratings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin sesión responde 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Se requiere una sesión activa"));
    const response = await GET(new NextRequest("http://localhost/api/me/ratings"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("sin filtros pasa filtros vacíos al servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRatings.mockResolvedValue(listResult);
    const response = await GET(new NextRequest("http://localhost/api/me/ratings"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(listResult);
    expect(mocks.listMyRatings).toHaveBeenCalledWith(user.id, 1, 20, {});
  });

  it("parsea sort/stars/type/year/decade", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRatings.mockResolvedValue(listResult);
    await GET(
      new NextRequest("http://localhost/api/me/ratings?sort=worst&stars=4.5&type=recording&year=1987"),
    );
    expect(mocks.listMyRatings).toHaveBeenCalledWith(user.id, 1, 20, {
      sort: "worst",
      stars: 4.5,
      type: "recording",
      year: 1987,
    });
  });

  it("parsea q y group", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRatings.mockResolvedValue(listResult);
    await GET(new NextRequest("http://localhost/api/me/ratings?q=%20floyd%20&group=none"));
    expect(mocks.listMyRatings).toHaveBeenCalledWith(user.id, 1, 20, { q: "floyd", group: "none" });
  });

  it("ignora una búsqueda en blanco", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRatings.mockResolvedValue(listResult);
    await GET(new NextRequest("http://localhost/api/me/ratings?q=%20%20"));
    expect(mocks.listMyRatings).toHaveBeenCalledWith(user.id, 1, 20, {});
  });

  it("acepta group=artist", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRatings.mockResolvedValue(listResult);
    await GET(new NextRequest("http://localhost/api/me/ratings?group=artist"));
    expect(mocks.listMyRatings).toHaveBeenCalledWith(user.id, 1, 20, { group: "artist" });
  });

  it("rechaza una agrupación fuera de vocabulario", async () => {
    const response = await GET(new NextRequest("http://localhost/api/me/ratings?group=album"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listMyRatings).not.toHaveBeenCalled();
  });

  it("rechaza una búsqueda demasiado larga", async () => {
    const response = await GET(new NextRequest(`http://localhost/api/me/ratings?q=${"x".repeat(101)}`));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza un orden inválido con VALIDATION_ERROR", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/me/ratings?sort=chronological"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listMyRatings).not.toHaveBeenCalled();
  });

  it("rechaza estrellas inválidas", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/me/ratings?stars=6"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rechaza una década no múltiplo de 10", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/me/ratings?decade=1985"),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("no acepta parámetro de usuario", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyRatings.mockResolvedValue(listResult);
    await GET(new NextRequest("http://localhost/api/me/ratings?userId=other"));
    expect(mocks.listMyRatings).toHaveBeenCalledWith(user.id, 1, 20, {});
  });
});
