import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, PUT } from "./route";

const mocks = vi.hoisted(() => ({
  getNotificationPreferences: vi.fn(),
  updateNotificationPreferences: vi.fn(),
  requireUser: vi.fn(),
}));

vi.mock("@/services/notifications/preferences", () => ({
  getNotificationPreferences: mocks.getNotificationPreferences,
  updateNotificationPreferences: mocks.updateNotificationPreferences,
}));
vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));

const user = { id: "00000000-0000-4000-8000-000000000001" };
const preferences = {
  comment_reply: true,
  thread_reply: false,
  new_follower: true,
  follow_request: true,
  follow_accepted: true,
  moderation: true,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/me/notification-preferences", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/me/notification-preferences", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
    expect(mocks.getNotificationPreferences).not.toHaveBeenCalled();
  });

  it("devuelve las seis claves, fijas incluidas", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.getNotificationPreferences.mockResolvedValue(preferences);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ preferences });
    expect(mocks.getNotificationPreferences).toHaveBeenCalledWith(user.id);
  });
});

describe("PUT /api/me/notification-preferences", () => {
  it("sin sesión devuelve 401 AUTH_REQUIRED", async () => {
    mocks.requireUser.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "Sesión requerida"));

    const response = await PUT(request({ preferences: { thread_reply: false } }));

    expect(response.status).toBe(401);
    expect(mocks.updateNotificationPreferences).not.toHaveBeenCalled();
  });

  it("guarda un cambio parcial y devuelve el mapa completo", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateNotificationPreferences.mockResolvedValue(preferences);

    const response = await PUT(request({ preferences: { thread_reply: false } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ preferences });
    expect(mocks.updateNotificationPreferences).toHaveBeenCalledWith(user.id, {
      thread_reply: false,
    });
  });

  it("un tipo fijo responde 400 VALIDATION_ERROR", async () => {
    mocks.requireUser.mockResolvedValue(user);
    mocks.updateNotificationPreferences.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", 400, "Este tipo de notificación no se puede desactivar"),
    );

    const response = await PUT(request({ preferences: { moderation: false } }));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it.each([
    [{}],
    [{ preferences: { moderation: "no" } }],
    [{ preferences: { inventado: false } }],
    [null],
  ])("rechaza el cuerpo %j con VALIDATION_ERROR", async (body) => {
    const response = await PUT(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.updateNotificationPreferences).not.toHaveBeenCalled();
  });
});
