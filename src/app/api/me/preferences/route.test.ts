import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), setLocalePreference: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/account-settings", () => ({ setLocalePreference: mocks.setLocalePreference }));

import { PATCH } from "./route";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/me/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u1" });
  mocks.setLocalePreference.mockResolvedValue(undefined);
});

describe("PATCH /api/me/preferences", () => {
  it("guarda English", async () => {
    const res = await PATCH(req({ locale: "en" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ locale: "en" });
    expect(mocks.setLocalePreference).toHaveBeenCalledWith("u1", "en");
  });

  it("rechaza un idioma no soportado con un error de validación", async () => {
    const res = await PATCH(req({ locale: "fr" }));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.setLocalePreference).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo vacío", async () => {
    expect((await PATCH(req({}))).status).toBe(400);
  });

  it("exige sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await PATCH(req({ locale: "en" }))).status).toBe(401);
  });
});
