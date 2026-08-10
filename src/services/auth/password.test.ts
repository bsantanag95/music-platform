import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password auth", () => {
  it("hashea con Argon2id y verifica la contraseña correcta", async () => {
    const hash = await hashPassword("una-clave-segura");
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, "una-clave-segura")).resolves.toBe(true);
    await expect(verifyPassword(hash, "otra-clave")).resolves.toBe(false);
  });

  it("rechaza hashes ausentes o inválidos", async () => {
    await expect(verifyPassword(null, "clave")).resolves.toBe(false);
    await expect(verifyPassword("no-es-un-hash", "clave")).resolves.toBe(false);
  });
});
