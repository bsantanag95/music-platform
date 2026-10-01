import { describe, expect, it, vi } from "vitest";
import { deleteComment, updateComment, upsertRating } from "./social";

const mocks = vi.hoisted(() => ({ db: { insert: vi.fn(), select: vi.fn(), delete: vi.fn() } }));
vi.mock("@/db", () => ({ db: mocks.db }));

describe("servicio social", () => {
  const target = { type: "artist" as const, id: "00000000-0000-4000-8000-000000000001", column: "artistId" as const };

  it("rechaza estrellas fuera de rango o sin medio paso", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", 4.25)).rejects.toMatchObject({ code: "INVALID_RATING", status: 400 });
  });

  it("rechaza detailed score fuera de la banda de estrellas", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", 4, 31)).rejects.toMatchObject({ code: "INVALID_RATING" });
  });

  it("rechaza un cuerpo sin estrellas ni puntaje detallado", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", undefined)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 400 });
  });

  it("deriva las estrellas cuando solo llega el puntaje detallado", async () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: "00000000-0000-4000-8000-000000000003",
          userId: "00000000-0000-4000-8000-000000000002",
          artistId: target.id,
          releaseGroupId: null,
          recordingId: null,
          stars: "4.5",
          detailedScore: 86,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      }),
    });
    mocks.db.insert.mockReturnValue({ values });

    await upsertRating(target, "00000000-0000-4000-8000-000000000002", undefined, 86);

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ stars: "4.5", detailedScore: 86 }));
  });

  it("deja el puntaje en nulo cuando solo llegan las estrellas", async () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: "00000000-0000-4000-8000-000000000003",
          userId: "00000000-0000-4000-8000-000000000002",
          artistId: target.id,
          releaseGroupId: null,
          recordingId: null,
          stars: "4",
          detailedScore: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }]),
      }),
    });
    mocks.db.insert.mockReturnValue({ values });

    await upsertRating(target, "00000000-0000-4000-8000-000000000002", 4);

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ stars: "4", detailedScore: null }));
  });

  it("rechaza un puntaje incoherente con las estrellas indicadas", async () => {
    await expect(upsertRating(target, "00000000-0000-4000-8000-000000000002", 4, 86)).rejects.toMatchObject({ code: "INVALID_RATING", status: 400 });
  });

  it("no recibe user_id del cliente: la API de servicio exige userId separado", () => {
    expect(upsertRating.length).toBe(4);
  });

  it("hace el upsert en una única operación ON CONFLICT", async () => {
    const returning = vi.fn().mockResolvedValue([{
      id: "00000000-0000-4000-8000-000000000003",
      userId: "00000000-0000-4000-8000-000000000002",
      artistId: target.id,
      releaseGroupId: null,
      recordingId: null,
      stars: "4.0",
      detailedScore: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
    const onConflictDoUpdate = vi.fn().mockReturnValue({ returning });
    mocks.db.insert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate }) });

    await upsertRating(target, "00000000-0000-4000-8000-000000000002", 4);

    expect(onConflictDoUpdate).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.any(Array),
      targetWhere: expect.anything(),
    }));
  });

  it("distingue un comentario inexistente de uno sin permiso", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) });
    await expect(deleteComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002"))
      .rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });

    limit.mockResolvedValue([{ id: "00000000-0000-4000-8000-000000000004", userId: "00000000-0000-4000-8000-000000000005" }]);
    await expect(deleteComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002"))
      .rejects.toMatchObject({ code: "PERMISSION_DENIED", status: 403 });
  });

  it("distingue un comentario inexistente de uno sin permiso al editar", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    mocks.db.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) });
    await expect(updateComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002", "texto"))
      .rejects.toMatchObject({ code: "COMMENT_NOT_FOUND", status: 404 });

    limit.mockResolvedValue([{ id: "00000000-0000-4000-8000-000000000004", userId: "00000000-0000-4000-8000-000000000005" }]);
    await expect(updateComment("00000000-0000-4000-8000-000000000004", "00000000-0000-4000-8000-000000000002", "texto"))
      .rejects.toMatchObject({ code: "PERMISSION_DENIED", status: 403 });
  });
});
