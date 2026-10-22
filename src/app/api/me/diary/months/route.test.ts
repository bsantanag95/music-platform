import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  listMyDiaryMonths: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({ listMyDiaryMonths: mocks.listMyDiaryMonths }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const request = (query = "") => new NextRequest(`http://localhost/api/me/diary/months${query}`);

const user = { id: "00000000-0000-4000-8000-000000000001" };

describe("meses disponibles del diario (GET)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve los meses del usuario autenticado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyDiaryMonths.mockResolvedValue([
      { year: 2026, month: 9 },
      { year: 2026, month: 1 },
    ]);
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      months: [
        { year: 2026, month: 9 },
        { year: 2026, month: 1 },
      ],
    });
    expect(mocks.listMyDiaryMonths).toHaveBeenCalledWith(user.id, undefined);
  });

  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.listMyDiaryMonths).not.toHaveBeenCalled();
  });

  it("pasa la zona horaria de tz al servicio", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyDiaryMonths.mockResolvedValue([]);
    const response = await GET(request("?tz=America%2FSantiago"));
    expect(response.status).toBe(200);
    expect(mocks.listMyDiaryMonths).toHaveBeenCalledWith(user.id, "America/Santiago");
  });

  it.each(["Marte/Base", "+03:00", "x".repeat(70)])("tz desconocida (%s) devuelve 400 VALIDATION_ERROR", async (tz) => {
    mocks.requireUser.mockResolvedValue(user);
    const response = await GET(request(`?tz=${encodeURIComponent(tz)}`));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.listMyDiaryMonths).not.toHaveBeenCalled();
  });
});
