import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unsubscribeToken } from "@/services/notifications/unsubscribe";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  db: { update: vi.fn() },
}));

vi.mock("@/db", () => ({ db: mocks.db }));

const USER = "00000000-0000-4000-8000-00000000000a";

function mockUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  mocks.db.update.mockReturnValue({ set });
  return { set, where };
}

function post(token?: string) {
  const url = new URL("http://localhost/api/notifications/unsubscribe");
  if (token !== undefined) url.searchParams.set("token", token);
  return POST(new NextRequest(url, { method: "POST" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "secreto-de-prueba");
  mockUpdate();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/notifications/unsubscribe", () => {
  it("con un token válido desactiva el resumen sin sesión", async () => {
    const { set, where } = mockUpdate();

    const response = await post(unsubscribeToken(USER, "2026-10-26"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ unsubscribed: true });
    expect(set).toHaveBeenCalledWith({ notificationDigestEnabled: false });
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("un token alterado responde 400 y no cambia nada", async () => {
    const [encoded, mac] = unsubscribeToken(USER, "2026-10-26").split(".");
    const altered = `${encoded!.slice(0, -1)}${encoded!.endsWith("A") ? "B" : "A"}.${mac}`;

    const response = await post(altered);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_UNSUBSCRIBE_TOKEN" });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("un token firmado con otro secreto responde 400", async () => {
    const token = unsubscribeToken(USER, "2026-10-26");
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "otro-secreto");

    const response = await post(token);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_UNSUBSCRIBE_TOKEN" });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("sin token responde 400 INVALID_UNSUBSCRIBE_TOKEN", async () => {
    const response = await post();

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_UNSUBSCRIBE_TOKEN" });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("un token de una cuenta inexistente responde 200 sin distinguirla", async () => {
    // El `UPDATE` no encuentra filas: la respuesta no revela si la cuenta existe.
    const { set } = mockUpdate();

    const response = await post(
      unsubscribeToken("00000000-0000-4000-8000-0000000000ff", "2026-10-26"),
    );

    expect(response.status).toBe(200);
    expect(set).toHaveBeenCalledWith({ notificationDigestEnabled: false });
  });
});
