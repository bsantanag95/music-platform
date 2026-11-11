import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

// Crear un concierto de la comunidad (openspec: add-shared-concerts-phase2): validación, sesión y el 409 con el id
// existente. La lógica contra Postgres la cubre scripts/smoke-test-community-concerts.ts.

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), create: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/concerts/community", async () => {
  const { ApiError: BaseError } = await import("@/lib/api/errors");
  class ConcertDuplicateError extends BaseError {
    constructor(readonly concertId: string) {
      super("CONCERT_DUPLICATE", 409, "Ya existe ese concierto");
    }
  }
  return { createCommunityConcert: mocks.create, ConcertDuplicateError };
});

const { POST } = await import("./route");
const community = await import("@/services/concerts/community");

const user = { id: "00000000-0000-4000-8000-000000000001" };
const ARTIST = "00000000-0000-4000-8000-0000000000a1";
const valid = { artistId: ARTIST, eventDate: "2009-05-15", venue: "Teatro Caupolicán", city: "Santiago", country: "cl" };
const req = (body: unknown) =>
  new NextRequest("http://localhost/api/concerts", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("POST /api/concerts", () => {
  it("crea con el país en mayúsculas y sin artistas extra", async () => {
    mocks.create.mockResolvedValue({
      concert: { id: "00000000-0000-4000-8000-0000000000c1", name: "x", status: "pending" },
      entryId: "00000000-0000-4000-8000-0000000000e1",
    });
    const res = await POST(req(valid));
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(user.id, expect.objectContaining({ country: "CL", performers: [] }));
  });

  it.each([
    ["sin ciudad", { ...valid, city: undefined }],
    ["sin país", { ...valid, country: undefined }],
    ["sin recinto", { ...valid, venue: "  " }],
    ["fecha parcial", { ...valid, eventDate: "2009-05" }],
    ["fecha futura", { ...valid, eventDate: "2999-01-01" }],
    ["setlist que no es un setlist", { ...valid, setlistfmUrl: "https://www.setlist.fm/setlists/los-bunkers.html" }],
    ["más de 10 artistas extra", { ...valid, performers: Array.from({ length: 11 }, () => ({ artistId: ARTIST, role: "support" })) }],
  ] as [string, unknown][])("%s: 400 VALIDATION_ERROR sin crear", async (_label, body) => {
    const res = await POST(req(body));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("duplicado: 409 con el id del existente", async () => {
    mocks.create.mockRejectedValue(new community.ConcertDuplicateError("00000000-0000-4000-8000-0000000000c9"));
    const res = await POST(req(valid));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "CONCERT_DUPLICATE", concertId: "00000000-0000-4000-8000-0000000000c9" });
  });

  it("propaga los códigos del servicio", async () => {
    mocks.create.mockRejectedValue(new ApiError("CONCERT_CREATE_LIMIT", 429, "límite"));
    const res = await POST(req(valid));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "CONCERT_CREATE_LIMIT" });
  });

  it("sin sesión: 401", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "sin sesión"));
    const res = await POST(req(valid));
    expect(res.status).toBe(401);
  });
});
