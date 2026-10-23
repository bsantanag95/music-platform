import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  markSeen: vi.fn().mockResolvedValue(undefined),
  requireUser: vi.fn(),
}));

vi.mock("@/services/notifications/read", () => ({ markSeen: mocks.markSeen }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

beforeEach(() => vi.clearAllMocks());

describe("PUT /api/me/notifications/seen", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await PUT();

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.markSeen).not.toHaveBeenCalled();
  });

  it("marca la bandeja propia como vista", async () => {
    mocks.requireUser.mockResolvedValue(user);

    const response = await PUT();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.markSeen).toHaveBeenCalledWith(user.id);
  });
});
