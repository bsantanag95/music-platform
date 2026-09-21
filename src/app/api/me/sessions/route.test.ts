import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), listMySessions: vi.fn(), revokeSession: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireSession: mocks.requireSession }));
vi.mock("@/services/auth/session-list", () => ({
  listMySessions: mocks.listMySessions,
  revokeSession: mocks.revokeSession,
}));

import { GET } from "./route";
import { DELETE } from "./[id]/route";

const current = { sessionId: "11111111-1111-4111-8111-111111111111", user: { id: "user-1" } };
const otherId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireSession.mockResolvedValue(current);
});

describe("GET /api/me/sessions", () => {
  it("lista las sesiones propias con fechas ISO", async () => {
    mocks.listMySessions.mockResolvedValue([
      {
        id: current.sessionId,
        deviceLabel: "Chrome · Windows",
        createdAt: new Date("2026-09-21T10:00:00Z"),
        lastSeenAt: null,
        current: true,
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      sessions: [
        {
          id: current.sessionId,
          deviceLabel: "Chrome · Windows",
          createdAt: "2026-09-21T10:00:00.000Z",
          lastSeenAt: null,
          current: true,
        },
      ],
    });
    expect(mocks.listMySessions).toHaveBeenCalledWith("user-1", current.sessionId);
  });

  it("exige sesión", async () => {
    mocks.requireSession.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    expect((await GET()).status).toBe(401);
  });
});

describe("DELETE /api/me/sessions/[id]", () => {
  const call = (id: string) =>
    DELETE(new NextRequest(`http://localhost/api/me/sessions/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });

  it("cierra la sesión indicada", async () => {
    const res = await call(otherId);
    expect(res.status).toBe(204);
    expect(mocks.revokeSession).toHaveBeenCalledWith("user-1", otherId, current.sessionId);
  });

  it("responde 404 con un identificador que no es UUID, sin tocar la base", async () => {
    const res = await call("no-es-uuid");
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("SESSION_NOT_FOUND");
    expect(mocks.revokeSession).not.toHaveBeenCalled();
  });

  it("propaga el rechazo de cerrar la sesión actual", async () => {
    mocks.revokeSession.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "x"));
    expect((await call(current.sessionId)).status).toBe(400);
  });
});
