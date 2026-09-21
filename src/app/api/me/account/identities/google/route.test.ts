import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), unlinkGoogle: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/auth/identities", () => ({ unlinkGoogle: mocks.unlinkGoogle }));

import { DELETE } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.unlinkGoogle.mockResolvedValue(undefined);
});

describe("DELETE /api/me/account/identities/google", () => {
  it("desvincula Google de la cuenta de la sesión", async () => {
    const res = await DELETE();
    expect(res.status).toBe(204);
    expect(mocks.unlinkGoogle).toHaveBeenCalledWith("u1");
  });

  it("responde 409 LAST_ACCESS_METHOD si es el único método de acceso", async () => {
    mocks.unlinkGoogle.mockRejectedValue(new ApiError("LAST_ACCESS_METHOD", 409, "x"));
    const res = await DELETE();
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("LAST_ACCESS_METHOD");
  });

  it("exige sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await DELETE()).status).toBe(401);
    expect(mocks.unlinkGoogle).not.toHaveBeenCalled();
  });
});
