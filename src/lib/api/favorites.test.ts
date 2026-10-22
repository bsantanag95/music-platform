import { beforeEach, describe, expect, it, vi } from "vitest";
import { addFavorite } from "./favorites";

// openspec: redesign-favorites-views. El "Deshacer" de quitar re-crea el favorito con su audiencia anterior.

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("./client", () => ({ apiFetch: mocks.apiFetch }));

describe("addFavorite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hace POST con el objetivo y la audiencia, y devuelve el favorito creado", async () => {
    const created = { id: "f1" };
    mocks.apiFetch.mockResolvedValue({ favorite: created });

    const result = await addFavorite({ type: "release-group", id: "rg1" }, "private");

    expect(result).toBe(created);
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/favorites");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ target: { type: "release-group", id: "rg1" }, audience: "private" });
  });

  it("devuelve null si el servidor lo quitó (POST alterna)", async () => {
    mocks.apiFetch.mockResolvedValue({ favorite: null });
    expect(await addFavorite({ type: "artist", id: "a1" }, "public")).toBeNull();
  });
});
