import { describe, expect, it, vi, beforeEach } from "vitest";
import { createComment, deleteComment, saveRating, updateComment } from "./social";

describe("cliente API social", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("parsea los wrappers reales de rating y comentarios", async () => {
    const fetchMock = vi.spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ rating: { id: "a1b2c3d4-0000-4000-8000-000000000001", stars: 4, detailedScore: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ comment: { id: "a1b2c3d4-0000-4000-8000-000000000002", user: { id: "a1b2c3d4-0000-4000-8000-000000000003", username: "ana", displayName: null }, body: "Hola", createdAt: "2026-01-01" } }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ comment: { id: "a1b2c3d4-0000-4000-8000-000000000002", user: { id: "a1b2c3d4-0000-4000-8000-000000000003", username: "ana", displayName: null }, body: "Adiós", createdAt: "2026-01-01" } }), { status: 200 }));

    await expect(saveRating("artist", "a1b2c3d4-0000-4000-8000-000000000004", { stars: 4 })).resolves.toMatchObject({ rating: { stars: 4 } });
    await expect(createComment("artist", "a1b2c3d4-0000-4000-8000-000000000004", "Hola")).resolves.toMatchObject({ body: "Hola" });
    await expect(updateComment("a1b2c3d4-0000-4000-8000-000000000002", "Adiós")).resolves.toMatchObject({ body: "Adiós" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("mantiene 204 como respuesta vacía para DELETE", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteComment("a1b2c3d4-0000-4000-8000-000000000002")).resolves.toBeNull();
  });
});
