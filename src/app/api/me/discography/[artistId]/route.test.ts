// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ARTIST = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";
const mocks = vi.hoisted(() => ({ user: vi.fn(), save: vi.fn(), found: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.user }));
vi.mock("@/services/laminas/discography", () => ({ saveDiscographyPreference: mocks.save }));
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: mocks.found }) }) }) },
}));

import { PUT } from "./route";

const req = (body: unknown) =>
  new NextRequest(`http://localhost/api/me/discography/${ARTIST}`, { method: "PUT", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const context = (artistId = ARTIST) => ({ params: Promise.resolve({ artistId }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "u1" });
  mocks.found.mockResolvedValue([{ id: ARTIST }]);
  mocks.save.mockImplementation(async (_user: string, _artist: string, preference: unknown) => preference);
});

describe("PUT /api/me/discography/[artistId]", () => {
  it("guarda secciones y vista del dueño", async () => {
    const res = await PUT(req({ sections: ["live"], view: "song" }), context());
    expect(res.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("u1", ARTIST, { sections: ["live"], view: "song" });
  });

  it.each([
    ["una sección que no se puede sumar", { sections: ["singles"], view: "disc" }],
    ["una vista desconocida", { sections: [], view: "grid" }],
    ["sin vista", { sections: [] }],
  ])("rechaza %s", async (_label, body) => {
    expect((await PUT(req(body), context())).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("un artista inexistente responde 404", async () => {
    mocks.found.mockResolvedValue([]);
    expect((await PUT(req({ sections: [], view: "disc" }), context())).status).toBe(404);
    expect((await PUT(req({ sections: [], view: "disc" }), context("x"))).status).toBe(404);
  });
});
