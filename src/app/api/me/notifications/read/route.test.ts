import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  markRead: vi.fn().mockResolvedValue(undefined),
  requireUser: vi.fn(),
}));

vi.mock("@/services/notifications/read", () => ({ markRead: mocks.markRead }));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };

function request(body: unknown, query = "") {
  return new NextRequest(`http://localhost/api/me/notifications/read${query}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("POST /api/me/notifications/read", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await POST(request({ all: true }));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it("con `all` marca todas las del usuario de la sesión", async () => {
    mocks.requireUser.mockResolvedValue(user);

    const response = await POST(request({ all: true }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.markRead).toHaveBeenCalledWith(user.id, { all: true }, undefined);
  });

  it("con claves marca solo esas entradas y pasa la zona", async () => {
    mocks.requireUser.mockResolvedValue(user);

    await POST(
      request(
        { groupKeys: ["thread:root", "followers:2026-10-23"] },
        "?tz=America%2FSantiago",
      ),
    );

    expect(mocks.markRead).toHaveBeenCalledWith(
      user.id,
      { groupKeys: ["thread:root", "followers:2026-10-23"] },
      "America/Santiago",
    );
  });

  it("una clave de otra persona no cambia de destinatario: manda la sesión", async () => {
    mocks.requireUser.mockResolvedValue(user);

    await POST(request({ groupKeys: ["thread:de-otra-persona"] }));

    expect(mocks.markRead).toHaveBeenCalledWith(
      user.id,
      { groupKeys: ["thread:de-otra-persona"] },
      undefined,
    );
  });

  it.each([
    [{ all: false }],
    [{ groupKeys: [] }],
    [{ groupKeys: [""] }],
    [{}],
    [null],
    ["all"],
  ])("rechaza el cuerpo %j con VALIDATION_ERROR", async (body) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.markRead).not.toHaveBeenCalled();
  });

  it("rechaza un día de seguidores inválido que el servicio detecta", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.markRead.mockRejectedValueOnce(
      new ApiError("VALIDATION_ERROR", 400, 'El valor de "groupKeys" no es válido'),
    );

    const response = await POST(request({ groupKeys: ["followers:ayer"] }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
