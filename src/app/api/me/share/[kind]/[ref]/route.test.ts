// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ user: vi.fn(), allowed: vi.fn(), state: vi.fn(), make: vi.fn(), stop: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.user, requireSocialActivityAllowed: mocks.allowed }));
vi.mock("@/services/share/own", () => ({
  isOwnShareKind: (value: string) => value === "rating" || value === "listen",
  ownShareState: mocks.state,
  makeOwnPublic: mocks.make,
  stopSharingRating: mocks.stop,
}));

import { DELETE, GET, POST } from "./route";

const context = (kind: string, ref = "r1") => ({ params: Promise.resolve({ kind, ref }) });
const request = (method: string) => new NextRequest("http://localhost/api/me/share/rating/r1?locale=en", { method });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "u1" });
  mocks.allowed.mockResolvedValue(undefined);
  mocks.state.mockResolvedValue({ state: "public" });
  mocks.make.mockResolvedValue({ state: "public" });
  mocks.stop.mockResolvedValue({ state: "needs_gesture" });
});

describe("/api/me/share/[kind]/[ref]", () => {
  it("GET da el estado del dueño en el idioma pedido", async () => {
    const res = await GET(request("GET"), context("rating"));
    expect(res.status).toBe(200);
    expect(mocks.state).toHaveBeenCalledWith("rating", "r1", "en", "u1");
  });

  it("exige sesión", async () => {
    mocks.user.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await GET(request("GET"), context("rating"))).status).toBe(401);
  });

  it("rechaza otro tipo", async () => {
    const res = await GET(request("GET"), context("album"));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
  });

  it("POST verifica la suspensión antes de hacer público", async () => {
    mocks.allowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    const res = await POST(request("POST"), context("listen"));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("SOCIAL_SUSPENSION_ACTIVE");
    expect(mocks.make).not.toHaveBeenCalled();
  });

  it("POST hace público lo pedido", async () => {
    await POST(request("POST"), context("listen", "l1"));
    expect(mocks.make).toHaveBeenCalledWith("listen", "l1", "en", "u1");
  });

  it("DELETE quita la marca, también a una cuenta suspendida", async () => {
    mocks.allowed.mockRejectedValue(new ApiError("SOCIAL_SUSPENSION_ACTIVE", 403, "x"));
    expect((await DELETE(request("DELETE"), context("rating"))).status).toBe(200);
    expect(mocks.stop).toHaveBeenCalledWith("r1", "en", "u1");
  });

  it("DELETE no aplica a una escucha", async () => {
    expect((await DELETE(request("DELETE"), context("listen"))).status).toBe(400);
  });
});
