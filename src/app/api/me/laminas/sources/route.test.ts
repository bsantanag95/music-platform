// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const LIST = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

const mocks = vi.hoisted(() => ({ user: vi.fn(), options: vi.fn(), candidates: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.user }));
vi.mock("@/services/laminas/sources", () => ({ listLaminaSourceOptions: mocks.options, listLaminaCandidates: mocks.candidates }));

import { GET as candidates } from "../candidates/route";
import { GET as sources } from "./route";

const req = (path: string) => new NextRequest(`http://localhost/api/me/laminas/${path}`);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "u1" });
  mocks.options.mockResolvedValue({ years: [] });
  mocks.candidates.mockResolvedValue([]);
});

describe("/api/me/laminas/sources", () => {
  it("pasa fuente, tipo y zona", async () => {
    const res = await sources(req("sources?source=ratings&entityType=recording&tz=America/Santiago"));
    expect(res.status).toBe(200);
    expect(mocks.options).toHaveBeenCalledWith("u1", { source: "ratings", entityType: "recording", timeZone: "America/Santiago" });
  });

  it.each(["sources?source=wall&entityType=recording", "sources?source=ratings&entityType=artist", "sources?source=ratings&entityType=recording&tz=Marte/Base"])(
    "rechaza %s",
    async (path) => {
      expect((await sources(req(path))).status).toBe(400);
      expect(mocks.options).not.toHaveBeenCalled();
    },
  );
});

describe("/api/me/laminas/candidates", () => {
  it("convierte los filtros", async () => {
    const res = await candidates(req(`candidates?source=favorites&entityType=release-group&year=1999&listenYear=2026&genre=metal`));
    expect(res.status).toBe(200);
    expect(mocks.candidates).toHaveBeenCalledWith("u1", expect.objectContaining({ source: "favorites", year: 1999, listenYear: 2026, genre: "metal" }));
  });

  it("pasa el límite de la tier list, hasta 50", async () => {
    await candidates(req(`candidates?source=ratings&entityType=recording&limit=50`));
    expect(mocks.candidates).toHaveBeenCalledWith("u1", expect.objectContaining({ limit: 50 }));
    expect((await candidates(req(`candidates?source=ratings&entityType=recording&limit=51`))).status).toBe(400);
    expect((await candidates(req(`candidates?source=ratings&entityType=recording&limit=0`))).status).toBe(400);
  });

  it("pasa la lista", async () => {
    await candidates(req(`candidates?source=list&entityType=release-group&list=${LIST}`));
    expect(mocks.candidates).toHaveBeenCalledWith("u1", expect.objectContaining({ list: LIST }));
  });

  it.each(["candidates?source=ratings&entityType=release-group&year=abc", "candidates?source=ratings&entityType=release-group&artist=x", "candidates?source=list&entityType=release-group&list=x"])(
    "rechaza %s",
    async (path) => {
      expect((await candidates(req(path))).status).toBe(400);
      expect(mocks.candidates).not.toHaveBeenCalled();
    },
  );
});
