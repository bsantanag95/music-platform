import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, POST } from "./route";
import { DELETE, PATCH } from "./[id]/route";

// Rutas de Mis conciertos (openspec: add-my-concerts): validación, sesión y códigos de error.

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  addConcert: vi.fn(),
  listOwnConcerts: vi.fn(),
  updateConcert: vi.fn(),
  removeConcert: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/concerts/concerts", () => ({
  addConcert: mocks.addConcert,
  listOwnConcerts: mocks.listOwnConcerts,
  updateConcert: mocks.updateConcert,
  removeConcert: mocks.removeConcert,
}));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const ARTIST = "00000000-0000-4000-8000-0000000000a1";
const ENTRY = "00000000-0000-4000-8000-0000000000c1";

function req(url: string, init?: { method?: string; body?: unknown }) {
  return new NextRequest(`http://localhost${url}`, {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
});

describe("POST /api/me/concerts", () => {
  it("registra con 201 y recorta los textos", async () => {
    mocks.addConcert.mockResolvedValue({ id: ENTRY });
    const res = await POST(req("/api/me/concerts", { method: "POST", body: { artistId: ARTIST, eventDate: "2019", city: " Lima " } }));
    expect(res.status).toBe(201);
    expect(mocks.addConcert).toHaveBeenCalledWith(user.id, expect.objectContaining({ artistId: ARTIST, eventDate: "2019", city: "Lima" }));
  });

  it("fecha inválida: 400 VALIDATION_ERROR sin llegar al servicio", async () => {
    const res = await POST(req("/api/me/concerts", { method: "POST", body: { artistId: ARTIST, eventDate: "2019-13" } }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.addConcert).not.toHaveBeenCalled();
  });

  it("enlace que no es un setlist: 400", async () => {
    const res = await POST(
      req("/api/me/concerts", {
        method: "POST",
        body: { artistId: ARTIST, eventDate: "2019", setlistfmUrl: "https://example.com/setlist/x" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("sin sesión: 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));
    const res = await POST(req("/api/me/concerts", { method: "POST", body: { artistId: ARTIST, eventDate: "2019" } }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });
});

describe("GET /api/me/concerts", () => {
  it("filtra por artista", async () => {
    mocks.listOwnConcerts.mockResolvedValue({ entries: [], totals: { concerts: 0, artists: 0, countries: 0 }, truncated: false });
    const res = await GET(req(`/api/me/concerts?artistId=${ARTIST}`));
    expect(res.status).toBe(200);
    expect(mocks.listOwnConcerts).toHaveBeenCalledWith(user.id, { artistId: ARTIST });
  });

  it("artista mal formado: 400", async () => {
    const res = await GET(req("/api/me/concerts?artistId=nope"));
    expect(res.status).toBe(400);
  });
});

describe("PATCH / DELETE /api/me/concerts/[id]", () => {
  it("id mal formado: 404 CONCERT_NOT_FOUND", async () => {
    const res = await PATCH(req("/api/me/concerts/nope", { method: "PATCH", body: { note: "x" } }), ctx("nope"));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "CONCERT_NOT_FOUND" });
  });

  it("modificación vacía: 400", async () => {
    const res = await PATCH(req(`/api/me/concerts/${ENTRY}`, { method: "PATCH", body: {} }), ctx(ENTRY));
    expect(res.status).toBe(400);
  });

  it("edita con los campos indicados", async () => {
    mocks.updateConcert.mockResolvedValue({ id: ENTRY });
    const res = await PATCH(req(`/api/me/concerts/${ENTRY}`, { method: "PATCH", body: { venue: null, audience: "public" } }), ctx(ENTRY));
    expect(res.status).toBe(200);
    expect(mocks.updateConcert).toHaveBeenCalledWith(ENTRY, user.id, expect.objectContaining({ venue: null, audience: "public" }));
  });

  it("quitar responde 204", async () => {
    mocks.removeConcert.mockResolvedValue(undefined);
    const res = await DELETE(req(`/api/me/concerts/${ENTRY}`, { method: "DELETE" }), ctx(ENTRY));
    expect(res.status).toBe(204);
  });

  it("quitar uno ajeno: el 404 del servicio llega tal cual", async () => {
    mocks.removeConcert.mockRejectedValue(new ApiError("CONCERT_NOT_FOUND", 404, "El concierto no existe"));
    const res = await DELETE(req(`/api/me/concerts/${ENTRY}`, { method: "DELETE" }), ctx(ENTRY));
    expect(res.status).toBe(404);
  });
});
