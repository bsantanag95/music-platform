import { describe, expect, it, vi } from "vitest";
import { registerUser } from "./users";

const mocks = vi.hoisted(() => ({ db: { insert: vi.fn(), select: vi.fn() }, hashPassword: vi.fn() }));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./password", () => ({ hashPassword: mocks.hashPassword, verifyPassword: vi.fn() }));

describe("usuarios", () => {
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
