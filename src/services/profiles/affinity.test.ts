import { beforeEach, describe, expect, it, vi } from "vitest";
import { mutualFollowersHint } from "./affinity";

const mocks = vi.hoisted(() => ({ db: { select: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));

// db.select().from().where()  — la primera llamada resuelve la lista de
// seguidos del visitante; la segunda, el count.
function queueWhereResults(...results: unknown[][]) {
  const from = vi.fn();
  mocks.db.select.mockReturnValue({ from });
  from.mockImplementation(() => ({
    where: vi.fn().mockResolvedValue(results.shift() ?? []),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("mutualFollowersHint", () => {
  it("cuenta los seguidores del dueño que el visitante también sigue", async () => {
    queueWhereResults([{ id: "a" }, { id: "b" }, { id: "c" }], [{ count: 3 }]);
    await expect(mutualFollowersHint("viewer", "owner")).resolves.toBe(3);
  });

  it("devuelve 0 si el visitante no sigue a nadie (sin segunda query)", async () => {
    queueWhereResults([]);
    await expect(mutualFollowersHint("viewer", "owner")).resolves.toBe(0);
    expect(mocks.db.select).toHaveBeenCalledTimes(1);
  });

  it("devuelve 0 cuando el visitante es el propio dueño", async () => {
    await expect(mutualFollowersHint("same", "same")).resolves.toBe(0);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("devuelve 0 si no hay solapamiento", async () => {
    queueWhereResults([{ id: "x" }], [{ count: 0 }]);
    await expect(mutualFollowersHint("viewer", "owner")).resolves.toBe(0);
  });
});
