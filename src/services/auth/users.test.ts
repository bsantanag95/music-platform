import { beforeEach, describe, expect, it, vi } from "vitest";
import { TERMS_VERSION } from "@/lib/terms";
import { registerUser } from "./users";

const mocks = vi.hoisted(() => ({
  db: { insert: vi.fn(), select: vi.fn() },
  hashPassword: vi.fn(),
  isUsernameReserved: vi.fn(),
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./username", () => ({ isUsernameReserved: mocks.isUsernameReserved }));
vi.mock("./password", () => ({ hashPassword: mocks.hashPassword, verifyPassword: vi.fn() }));

describe("usuarios", () => {
  beforeEach(() => mocks.isUsernameReserved.mockResolvedValue(false));

  it("rechaza registrar un usuario que alguien tiene reservado, sin insertar", async () => {
    mocks.isUsernameReserved.mockResolvedValue(true);
    mocks.db.insert.mockClear();

    await expect(registerUser({ username: "ana", email: "ana@example.com", password: "password" }))
      .rejects.toThrow("USERNAME_TAKEN");
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("con aceptación por casilla guarda fecha, versión y modo; sin ella, no inventa una", async () => {
    mocks.hashPassword.mockResolvedValue("hash");
    const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "u1" }]) });
    mocks.db.insert.mockReturnValue({ values });
    const input = { username: "ana", email: "ana@example.com", password: "password" };

    await registerUser(input, "checkbox");
    expect(values.mock.calls[0]?.[0]).toMatchObject({
      username: "ana",
      termsAcceptedAt: expect.any(Date),
      termsVersion: TERMS_VERSION,
      termsAcceptedVia: "checkbox",
    });

    await registerUser(input);
    expect(values.mock.calls[1]?.[0]).not.toHaveProperty("termsAcceptedAt");
    expect(values.mock.calls[1]?.[0]).not.toHaveProperty("termsAcceptedVia");
  });

  it("detecta una unique violation con un error desconocido", async () => {
    mocks.hashPassword.mockResolvedValue("hash");
    mocks.db.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue({ code: "23505" }) }) });
    const limit = vi.fn().mockResolvedValue([{ username: "ana", email: "ana@example.com" }]);
    mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) });

    await expect(registerUser({ username: "ana", email: "ana@example.com", password: "password" }))
      .rejects.toThrow("USERNAME_TAKEN");
  });

  it("relanza errores que no son unique violation", async () => {
    const error = { code: "ECONNRESET" };
    mocks.db.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockRejectedValue(error) }) });

    await expect(registerUser({ username: "ana", email: "ana@example.com", password: "password" }))
      .rejects.toBe(error);
  });
});
