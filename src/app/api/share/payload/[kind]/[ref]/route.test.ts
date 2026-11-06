// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearAuthAttempts } from "@/services/auth/rate-limit";

const mocks = vi.hoisted(() => ({ load: vi.fn(), payload: vi.fn() }));

vi.mock("@/services/share/targets", () => ({ loadShareTarget: mocks.load }));
vi.mock("@/services/share/metadata", () => ({ sharePayloadFor: mocks.payload }));

import { GET } from "./route";

function call(kind: string, ref: string, query = "", ip = "203.0.113.20") {
  const req = new NextRequest(`http://localhost/api/share/payload/${kind}/${ref}${query}`);
  Object.defineProperty(req, "ip", { value: ip });
  return GET(req, { params: Promise.resolve({ kind, ref }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearAuthAttempts();
  mocks.load.mockResolvedValue({ kind: "album" });
  mocks.payload.mockReturnValue({ url: "https://ejemplo.app/es/album/x" });
});

describe("GET /api/share/payload/[kind]/[ref]", () => {
  it("devuelve los datos de la hoja, calculados como anónimo", async () => {
    const res = await call("album", "rg1", "?locale=en");
    expect(res.status).toBe(200);
    expect(mocks.load).toHaveBeenCalledWith("album", "rg1", "en");
    expect((await res.json()).url).toContain("/album/x");
  });

  it("sin objetivo responde 404", async () => {
    mocks.load.mockResolvedValue(null);
    const res = await call("list", "l1");
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("SHARE_TARGET_NOT_FOUND");
  });

  it("rechaza un tipo o un idioma desconocidos", async () => {
    expect((await call("podcast", "x")).status).toBe(400);
    expect((await call("album", "x", "?locale=fr")).status).toBe(400);
  });

  it("limita los pedidos por IP", async () => {
    for (let i = 0; i < 60; i++) expect((await call("album", "rg1")).status).toBe(200);
    expect((await call("album", "rg1")).status).toBe(429);
  });
});
