import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { DELETE, POST } from "./route";
import { POST as DISMISS } from "../dismissals/route";

// Enlazar, desvincular y descartar (openspec: add-shared-concerts-phase3): validación, sesión y códigos. La lógica contra
// Postgres la cubre scripts/smoke-test-concert-links-tours.ts.

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), link: vi.fn(), unlink: vi.fn(), dismiss: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/concerts/suggestions", () => ({
  linkEntryToConcert: mocks.link,
  unlinkEntry: mocks.unlink,
  dismissLinkSuggestion: mocks.dismiss,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const ENTRY = "00000000-0000-4000-8000-0000000000e1";
const CONCERT = "00000000-0000-4000-8000-0000000000c1";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (method: string, body?: unknown) =>
  new NextRequest(`http://localhost/api/me/concerts/${ENTRY}/link`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("POST /api/me/concerts/[id]/link", () => {
  it("enlaza y devuelve el recuerdo", async () => {
    mocks.link.mockResolvedValue({ id: ENTRY });
    const res = await POST(req("POST", { concertId: CONCERT }), ctx(ENTRY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ entry: { id: ENTRY } });
    expect(mocks.link).toHaveBeenCalledWith(user.id, ENTRY, CONCERT);
  });

  it("sin concierto: 400", async () => {
    expect((await POST(req("POST", {}), ctx(ENTRY))).status).toBe(400);
    expect(mocks.link).not.toHaveBeenCalled();
  });

  it("id mal formado: 404 CONCERT_NOT_FOUND", async () => {
    const res = await POST(req("POST", { concertId: CONCERT }), ctx("x"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "CONCERT_NOT_FOUND" });
  });

  it.each([
    ["CONCERT_LINK_INVALID", 400],
    ["CONCERT_LINK_CONFLICT", 409],
  ] as const)("propaga %s", async (code, status) => {
    mocks.link.mockRejectedValue(new ApiError(code, status, "x"));
    const res = await POST(req("POST", { concertId: CONCERT }), ctx(ENTRY));
    expect(res.status).toBe(status);
    expect(await res.json()).toMatchObject({ code });
  });

  it("sin sesión: 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "sin sesión"));
    expect((await POST(req("POST", { concertId: CONCERT }), ctx(ENTRY))).status).toBe(401);
  });
});

describe("DELETE /api/me/concerts/[id]/link", () => {
  it("desvincula y devuelve el recuerdo", async () => {
    mocks.unlink.mockResolvedValue({ id: ENTRY, concertId: null });
    const res = await DELETE(req("DELETE"), ctx(ENTRY));
    expect(res.status).toBe(200);
    expect(mocks.unlink).toHaveBeenCalledWith(user.id, ENTRY);
  });
});

describe("POST /api/me/concerts/[id]/dismissals", () => {
  it("descarta: 204", async () => {
    mocks.dismiss.mockResolvedValue(undefined);
    const res = await DISMISS(req("POST", { concertId: CONCERT }), ctx(ENTRY));
    expect(res.status).toBe(204);
    expect(mocks.dismiss).toHaveBeenCalledWith(user.id, ENTRY, CONCERT);
  });

  it("concierto mal formado: 400", async () => {
    expect((await DISMISS(req("POST", { concertId: "x" }), ctx(ENTRY))).status).toBe(400);
  });
});
