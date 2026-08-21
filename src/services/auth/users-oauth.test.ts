import { describe, expect, it, vi } from "vitest";
import { findAvailableUsername, sanitizeUsernameFromEmail } from "./users";

const mocks = vi.hoisted(() => ({
  db: { insert: vi.fn(), select: vi.fn() },
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./password", () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));

describe("sanitizeUsernameFromEmail", () => {
  it("remueve caracteres no permitidos", () => {
    expect(sanitizeUsernameFromEmail("juan.perez")).toBe("juanperez");
    expect(sanitizeUsernameFromEmail("ana+test")).toBe("anatest");
    expect(sanitizeUsernameFromEmail("user@name")).toBe("username");
  });

  it("rellena si queda por debajo de 3 caracteres", () => {
    expect(sanitizeUsernameFromEmail("ab")).toBe("ab_");
    expect(sanitizeUsernameFromEmail("a")).toBe("a__");
  });

  it("trunca a 32 caracteres", () => {
    const long = "a".repeat(50);
    expect(sanitizeUsernameFromEmail(long)).toHaveLength(32);
  });

  it("usa 'user' si el resultado queda vacío", () => {
    expect(sanitizeUsernameFromEmail("@@@")).toBe("user");
  });
});

describe("findAvailableUsername", () => {
  it("devuelve el username base si está libre", async () => {
    const limit = vi.fn().mockResolvedValueOnce([]);
    mocks.db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }),
    });

    const result = await findAvailableUsername("juan.perez");
    expect(result).toBe("juanperez");
  });

  it("agrega sufijo numérico en colisión", async () => {
    mocks.db.select
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValueOnce([{ username: "juanperez" }]) }) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValueOnce([]) }) }),
      });

    const result = await findAvailableUsername("juan.perez");
    expect(result).toBe("juanperez2");
  });
});
