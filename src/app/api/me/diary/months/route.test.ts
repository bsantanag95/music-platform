import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  listMyDiaryMonths: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({ listMyDiaryMonths: mocks.listMyDiaryMonths }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

describe("meses disponibles del diario (GET)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve los meses del usuario autenticado", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.listMyDiaryMonths.mockResolvedValue([
      { year: 2026, month: 9 },
      { year: 2026, month: 1 },
    ]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      months: [
        { year: 2026, month: 9 },
        { year: 2026, month: 1 },
      ],
    });
    expect(mocks.listMyDiaryMonths).toHaveBeenCalledWith(user.id);
  });

  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.listMyDiaryMonths).not.toHaveBeenCalled();
  });
});
