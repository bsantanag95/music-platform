import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { POST } from "./route";

// Reportar un concierto (openspec: add-shared-concerts-phase2): motivo cerrado, sesión y reporte repetido.

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), reportConcert: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/concerts/community", () => ({ reportConcert: mocks.reportConcert }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const CONCERT = "00000000-0000-4000-8000-0000000000c1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) =>
  new NextRequest(`http://localhost/api/concerts/${CONCERT}/report`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("POST /api/concerts/[id]/report", () => {
  it("crea un reporte con motivo y texto", async () => {
    mocks.reportConcert.mockResolvedValue({ id: "00000000-0000-4000-8000-0000000000f1" });
    const res = await POST(req({ reason: "did_not_happen", details: " Nunca tocaron ahí " }), ctx(CONCERT));
    expect(res.status).toBe(201);
    expect(mocks.reportConcert).toHaveBeenCalledWith(user.id, CONCERT, "did_not_happen", "Nunca tocaron ahí");
  });

  it("repetido mientras sigue abierto: 200 sin reporte nuevo", async () => {
    mocks.reportConcert.mockResolvedValue(null);
    const res = await POST(req({ reason: "duplicate" }), ctx(CONCERT));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ report: null });
  });

  it("motivo desconocido: 400", async () => {
    const res = await POST(req({ reason: "spam" }), ctx(CONCERT));
    expect(res.status).toBe(400);
  });

  it("id mal formado: 404", async () => {
    const res = await POST(req({ reason: "duplicate" }), ctx("x"));
    expect(res.status).toBe(404);
  });

  it("sin sesión: 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "sin sesión"));
    const res = await POST(req({ reason: "wrong_data" }), ctx(CONCERT));
    expect(res.status).toBe(401);
  });
});
