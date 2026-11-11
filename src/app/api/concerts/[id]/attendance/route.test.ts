import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { DELETE, POST } from "./route";

// "Estuve ahí" (openspec: add-shared-concerts-phase1): validación, sesión y códigos. La lógica contra Postgres la cubre
// scripts/smoke-test-shared-concerts.ts.

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), attendConcert: vi.fn(), unattendConcert: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/concerts/shared", () => ({ attendConcert: mocks.attendConcert, unattendConcert: mocks.unattendConcert }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const CONCERT = "00000000-0000-4000-8000-0000000000c1";
const ARTIST = "00000000-0000-4000-8000-0000000000a1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: string) =>
  new NextRequest(`http://localhost/api/concerts/${CONCERT}/attendance`, { method, body, headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("POST /api/concerts/[id]/attendance", () => {
  it("con el artista de contexto", async () => {
    mocks.attendConcert.mockResolvedValue({ entryId: "00000000-0000-4000-8000-0000000000e1" });
    const res = await POST(req("POST", JSON.stringify({ artistId: ARTIST })), ctx(CONCERT));
    expect(res.status).toBe(200);
    expect(mocks.attendConcert).toHaveBeenCalledWith(user.id, CONCERT, ARTIST);
  });

  it("sin cuerpo", async () => {
    mocks.attendConcert.mockResolvedValue({ entryId: "00000000-0000-4000-8000-0000000000e1" });
    const res = await POST(req("POST"), ctx(CONCERT));
    expect(res.status).toBe(200);
    expect(mocks.attendConcert).toHaveBeenCalledWith(user.id, CONCERT, null);
  });

  it("id mal formado: 404 SHARED_CONCERT_NOT_FOUND", async () => {
    const res = await POST(req("POST"), ctx("nope"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "SHARED_CONCERT_NOT_FOUND" });
  });

  it("artista mal formado o JSON roto: 400", async () => {
    expect((await POST(req("POST", JSON.stringify({ artistId: "x" })), ctx(CONCERT))).status).toBe(400);
    expect((await POST(req("POST", "{"), ctx(CONCERT))).status).toBe(400);
  });

  it("sin sesión: 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    expect((await POST(req("POST"), ctx(CONCERT))).status).toBe(401);
  });

  it("el error del servicio llega tal cual (concierto futuro)", async () => {
    mocks.attendConcert.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "futuro"));
    expect((await POST(req("POST"), ctx(CONCERT))).status).toBe(400);
  });
});

describe("DELETE /api/concerts/[id]/attendance", () => {
  it("responde 204", async () => {
    mocks.unattendConcert.mockResolvedValue({ removed: "deleted" });
    const res = await DELETE(req("DELETE"), ctx(CONCERT));
    expect(res.status).toBe(204);
    expect(mocks.unattendConcert).toHaveBeenCalledWith(user.id, CONCERT);
  });
});
