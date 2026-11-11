import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { POST } from "./route";

// Fusionar conciertos (openspec: add-shared-concerts-phase2): permiso, validación y resultado.

const mocks = vi.hoisted(() => ({ requirePermission: vi.fn(), mergeConcert: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/concerts/community", () => ({ mergeConcert: mocks.mergeConcert }));

const SOURCE = "00000000-0000-4000-8000-0000000000c1";
const TARGET = "00000000-0000-4000-8000-0000000000c2";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => new NextRequest("http://localhost", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/moderation/concerts/[id]/merge", () => {
  it("fusiona con permiso", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "mod" });
    mocks.mergeConcert.mockResolvedValue({ moved: 2, unlinked: 1 });
    const res = await POST(req({ targetId: TARGET, reason: "Duplicado" }), ctx(SOURCE));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, moved: 2, unlinked: 1 });
    expect(mocks.mergeConcert).toHaveBeenCalledWith("mod", SOURCE, TARGET, "Duplicado");
  });

  it("sin permiso: 403", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));
    const res = await POST(req({ targetId: TARGET, reason: "Duplicado" }), ctx(SOURCE));
    expect(res.status).toBe(403);
    expect(mocks.mergeConcert).not.toHaveBeenCalled();
  });

  it("sin motivo o destino: 400", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "mod" });
    expect((await POST(req({ targetId: TARGET, reason: "" }), ctx(SOURCE))).status).toBe(400);
    expect((await POST(req({ reason: "x" }), ctx(SOURCE))).status).toBe(400);
  });
});
