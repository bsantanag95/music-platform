import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EmailConfigError } from "@/services/email";
import {
  isValidUnsubscribeToken,
  readUnsubscribeToken,
  unsubscribeApiUrl,
  unsubscribeFromDigest,
  unsubscribePageUrl,
  unsubscribeToken,
} from "./unsubscribe";

const mocks = vi.hoisted(() => ({ db: { update: vi.fn() } }));

vi.mock("@/db", () => ({ db: mocks.db }));

const ANA = "00000000-0000-4000-8000-00000000000a";

function mockUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  mocks.db.update.mockReturnValue({ set });
  return { set, where };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "secreto-de-prueba");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://music.example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("token de baja", () => {
  it("ida y vuelta: el token recién firmado se lee sin cambios", () => {
    const token = unsubscribeToken(ANA, "2026-10-19");

    expect(readUnsubscribeToken(token)).toEqual({ userId: ANA, issuedWeek: "2026-10-19" });
  });

  it("rechaza un token alterado", () => {
    const token = unsubscribeToken(ANA, "2026-10-19");
    const altered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;

    expect(readUnsubscribeToken(altered)).toBeNull();
  });

  it("rechaza un token firmado con otro secreto", () => {
    const token = unsubscribeToken(ANA, "2026-10-19");
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "otro-secreto");

    expect(readUnsubscribeToken(token)).toBeNull();
  });

  it("rechaza un token mal formado sin consultar el secreto de más", () => {
    expect(readUnsubscribeToken("")).toBeNull();
    expect(readUnsubscribeToken("sin-punto")).toBeNull();
    expect(readUnsubscribeToken(".firma")).toBeNull();
    expect(readUnsubscribeToken("carga.")).toBeNull();
  });

  it("rechaza una carga válidamente firmada pero con forma inesperada", () => {
    const token = unsubscribeToken("no-es-un-uuid", "2026-10-19");

    expect(readUnsubscribeToken(token)).toBeNull();
  });

  it("sin secreto falla cerrado", () => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "");

    expect(() => unsubscribeToken(ANA, "2026-10-19")).toThrow(EmailConfigError);
    expect(() => readUnsubscribeToken("a.b")).toThrow(EmailConfigError);
  });
});

describe("isValidUnsubscribeToken (GET de la página, sin escribir)", () => {
  it("acepta un token firmado y rechaza los demás", () => {
    expect(isValidUnsubscribeToken(unsubscribeToken(ANA, "2026-10-19"))).toBe(true);
    expect(isValidUnsubscribeToken("invalido")).toBe(false);
    expect(isValidUnsubscribeToken("")).toBe(false);
    expect(isValidUnsubscribeToken(null)).toBe(false);
    expect(isValidUnsubscribeToken(undefined)).toBe(false);
  });

  it("sin secreto falla cerrado en vez de romper la página", () => {
    vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "");

    expect(isValidUnsubscribeToken("a.b")).toBe(false);
  });
});

describe("unsubscribeFromDigest", () => {
  it("apaga solo el resumen de la persona del token", async () => {
    const { set, where } = mockUpdate();

    await unsubscribeFromDigest(unsubscribeToken(ANA, "2026-10-19"));

    expect(set).toHaveBeenCalledWith({ notificationDigestEnabled: false });
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("un token inválido responde 400 y no escribe", async () => {
    await expect(unsubscribeFromDigest("invalido")).rejects.toMatchObject({
      code: "INVALID_UNSUBSCRIBE_TOKEN",
      status: 400,
    });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });
});

describe("URLs de la baja", () => {
  it("arma la página con locale y el endpoint de un clic", () => {
    expect(unsubscribePageUrl("es", "abc.def")).toBe(
      "https://music.example/es/notifications/unsubscribe?token=abc.def",
    );
    expect(unsubscribeApiUrl("abc.def")).toBe(
      "https://music.example/api/notifications/unsubscribe?token=abc.def",
    );
  });
});
