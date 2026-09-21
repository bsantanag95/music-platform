import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { clearAuthAttempts } from "@/services/auth/rate-limit";

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), buildDataExport: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/profiles/data-export", () => ({ buildDataExport: mocks.buildDataExport }));

import { GET } from "./route";

const payload = { version: 1, exportedAt: "2026-09-21T15:00:00.000Z", account: { username: "ana" } };

beforeEach(() => {
  vi.clearAllMocks();
  clearAuthAttempts();
  mocks.requireUser.mockResolvedValue({ id: "u1", username: "ana" });
  mocks.buildDataExport.mockResolvedValue(payload);
});

describe("GET /api/me/export", () => {
  it("descarga un JSON adjunto con el nombre del usuario y la fecha", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="music-platform-ana-2026-09-21.json"');
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(await res.text())).toEqual(payload);
    expect(mocks.buildDataExport).toHaveBeenCalledWith("u1");
  });

  it("solo exporta los datos del usuario de la sesión", async () => {
    await GET();
    expect(mocks.buildDataExport).toHaveBeenCalledTimes(1);
    expect(mocks.buildDataExport.mock.calls[0]).toEqual(["u1"]);
  });

  it("limita a una exportación por minuto: la segunda responde 429 sin generar el archivo", async () => {
    expect((await GET()).status).toBe(200);
    const second = await GET();
    expect(second.status).toBe(429);
    expect((await second.json()).code).toBe("RATE_LIMITED");
    expect(mocks.buildDataExport).toHaveBeenCalledTimes(1);
  });

  it("el límite es por usuario: otra persona puede exportar", async () => {
    await GET();
    mocks.requireUser.mockResolvedValue({ id: "u2", username: "fran" });
    expect((await GET()).status).toBe(200);
  });

  it("pasado el minuto vuelve a permitir exportar", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-21T15:00:00Z"));
      expect((await GET()).status).toBe(200);
      vi.setSystemTime(new Date("2026-09-21T15:00:30Z"));
      expect((await GET()).status).toBe(429);
      vi.setSystemTime(new Date("2026-09-21T15:01:05Z"));
      expect((await GET()).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("exige sesión", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await GET()).status).toBe(401);
    expect(mocks.buildDataExport).not.toHaveBeenCalled();
  });
});
