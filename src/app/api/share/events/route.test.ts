import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { clearAuthAttempts } from "@/services/auth/rate-limit";

const mocks = vi.hoisted(() => ({ values: vi.fn() }));

vi.mock("@/db", () => ({
  db: { insert: () => ({ values: (row: unknown) => mocks.values(row) }) },
}));

import { POST } from "./route";

function request(body: unknown, ip = "203.0.113.7"): NextRequest {
  const req = new NextRequest("http://localhost/api/share/events", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", cookie: "session=abc", "user-agent": "Test/1.0" },
  });
  Object.defineProperty(req, "ip", { value: ip });
  return req;
}

const valid = { kind: "album", ref: "0b6c4a9e-1d8a-4e0f-9c1e-2b3f4a5d6e7f", channel: "x", format: "link" };

beforeEach(() => {
  vi.clearAllMocks();
  clearAuthAttempts();
  mocks.values.mockResolvedValue(undefined);
});

describe("POST /api/share/events", () => {
  it("guarda tipo, referencia, canal y formato y responde 204", async () => {
    const res = await POST(request(valid));
    expect(res.status).toBe(204);
    expect(mocks.values).toHaveBeenCalledWith({
      targetKind: "album",
      targetRef: valid.ref,
      channel: "x",
      format: "link",
    });
  });

  it("no guarda usuario, IP ni agente aunque el pedido los traiga", async () => {
    await POST(request(valid));
    const row = mocks.values.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(row).sort()).toEqual(["channel", "format", "targetKind", "targetRef"]);
    expect(JSON.stringify(row)).not.toContain("203.0.113.7");
    expect(JSON.stringify(row)).not.toContain("Test/1.0");
  });

  it.each([
    ["canal desconocido", { ...valid, channel: "myspace" }],
    ["tipo desconocido", { ...valid, kind: "podcast" }],
    ["formato no disponible", { ...valid, format: "story" }],
    ["referencia vacía", { ...valid, ref: "" }],
    ["referencia de más de 200", { ...valid, ref: "x".repeat(201) }],
    ["cuerpo no JSON", null],
  ])("rechaza %s con VALIDATION_ERROR sin guardar", async (_label, body) => {
    const res = await POST(request(body));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe("VALIDATION_ERROR");
    expect(mocks.values).not.toHaveBeenCalled();
  });

  it("limita a 30 eventos por minuto por IP", async () => {
    for (let i = 0; i < 30; i++) expect((await POST(request(valid))).status).toBe(204);
    const over = await POST(request(valid));
    expect(over.status).toBe(429);
    expect((await over.json()).code).toBe("RATE_LIMITED");
    expect((await POST(request(valid, "198.51.100.2"))).status).toBe(204);
  });
});
