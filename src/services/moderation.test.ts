import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
  requirePermissionForUser: vi.fn().mockResolvedValue(undefined),
}));
const emitMocks = vi.hoisted(() => ({ emitNotifications: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    transaction: mocks.transaction,
  },
}));
vi.mock("@/services/auth/authorization", () => ({
  requirePermissionForUser: mocks.requirePermissionForUser,
}));
vi.mock("@/services/notifications/emit", () => emitMocks);

import {
  hideComment,
  hideList,
  reportContent,
  resolveUserByIdentifier,
  restoreComment,
  revokeSocialSuspension,
  suspendSocialActivity,
  updateReportStatus,
} from "./moderation";

const TARGET_ID = "00000000-0000-4000-8000-000000000001";
const REPORTER_ID = "00000000-0000-4000-8000-000000000002";
const ACTOR_ID = "00000000-0000-4000-8000-000000000003";

function mockUserLookup(rows: unknown[]) {
  mocks.select.mockReturnValue({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
  });
}

function mockInsertReport() {
  mocks.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "report-1", userId: TARGET_ID, commentId: null, reviewId: null }]),
      }),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback({ insert: mocks.insert, update: mocks.update }),
  );
});

describe("reportContent con objetivo usuario", () => {
  it("reporta un perfil existente", async () => {
    mockUserLookup([{ id: TARGET_ID }]);
    mockInsertReport();

    const report = await reportContent(REPORTER_ID, { userId: TARGET_ID }, "Spam");

    expect(report?.userId).toBe(TARGET_ID);
  });

  it("bloquea el auto-reporte", async () => {
    await expect(
      reportContent(REPORTER_ID, { userId: REPORTER_ID }, "Spam"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("devuelve 404 si el usuario no existe", async () => {
    mockUserLookup([]);

    await expect(
      reportContent(REPORTER_ID, { userId: TARGET_ID }, "Spam"),
    ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});

describe("updateReportStatus con objetivo usuario", () => {
  it("audita la resolución con user_id", async () => {
    const values = vi.fn();
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: "report-1", status: "resolved", commentId: null, reviewId: null, userId: TARGET_ID },
          ]),
        }),
      }),
    });
    mocks.insert.mockReturnValue({ values });

    await updateReportStatus(ACTOR_ID, "report-1", "resolved");

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ action: "report_resolve", userId: TARGET_ID }),
    );
  });
});

function mockUpdatedTarget(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mocks.update.mockReturnValue({ set });
  return { set, where, returning };
}

function mockInsertReturns(rows: unknown[]) {
  const values = vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue(rows) });
  mocks.insert.mockReturnValueOnce({ values });
  return values;
}

describe("avisos de moderación (add-notifications-core)", () => {
  const AUTHOR_ID = "00000000-0000-4000-8000-000000000010";
  const OWNER_ID = "00000000-0000-4000-8000-000000000011";

  it("ocultar un comentario avisa a su autor con el id de la acción y sin actor", async () => {
    mockUpdatedTarget([{ userId: AUTHOR_ID }]);
    const values = mockInsertReturns([{ id: "action-1" }]);

    await hideComment(ACTOR_ID, "comment-1", "Spam");

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hide", commentId: "comment-1", reason: "Spam" }),
    );
    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(expect.anything(), [
      { kind: "moderation", recipientId: AUTHOR_ID, moderationActionId: "action-1" },
    ]);
  });

  it("restaurar un comentario vuelve a avisar a su autor", async () => {
    const { set } = mockUpdatedTarget([{ userId: AUTHOR_ID }]);
    mockInsertReturns([{ id: "action-2" }]);

    await restoreComment(ACTOR_ID, "comment-1", "Sin infracción");

    expect(set).toHaveBeenCalledWith(expect.objectContaining({ moderationStatus: "visible" }));
    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(expect.anything(), [
      { kind: "moderation", recipientId: AUTHOR_ID, moderationActionId: "action-2" },
    ]);
  });

  it("ocultar una lista avisa a su dueño", async () => {
    mockUpdatedTarget([{ ownerId: OWNER_ID }]);
    const values = mockInsertReturns([{ id: "action-3" }]);

    await hideList(ACTOR_ID, "list-1", "Contenido inapropiado");

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ action: "hide", listId: "list-1" }),
    );
    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(expect.anything(), [
      { kind: "moderation", recipientId: OWNER_ID, moderationActionId: "action-3" },
    ]);
  });

  it("suspender la actividad social avisa a la persona restringida", async () => {
    mockUserLookup([{ id: TARGET_ID }]);
    mockInsertReturns([{ id: "restriction-1", userId: TARGET_ID }]);
    mockInsertReturns([{ id: "action-4" }]);

    await suspendSocialActivity(ACTOR_ID, TARGET_ID, "Acoso", new Date(Date.now() + 86_400_000));

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(expect.anything(), [
      { kind: "moderation", recipientId: TARGET_ID, moderationActionId: "action-4" },
    ]);
  });

  it("revocar la suspensión resuelve el destinatario desde la restricción", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "restriction-1", userId: TARGET_ID }]);
    mocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) }),
    });
    mockInsertReturns([{ id: "action-5" }]);

    await revokeSocialSuspension(ACTOR_ID, "restriction-1");

    expect(emitMocks.emitNotifications).toHaveBeenCalledWith(expect.anything(), [
      { kind: "moderation", recipientId: TARGET_ID, moderationActionId: "action-5" },
    ]);
  });

  it("no emite nada si el contenido no existe", async () => {
    mockUpdatedTarget([]);

    await expect(hideComment(ACTOR_ID, "ghost", "Spam")).rejects.toMatchObject({
      code: "COMMENT_NOT_FOUND",
    });
    expect(emitMocks.emitNotifications).not.toHaveBeenCalled();
  });
});

describe("resolveUserByIdentifier", () => {
  function mockSelect(rowsPerCall: unknown[][]) {
    const limit = vi.fn();
    for (const rows of rowsPerCall) limit.mockResolvedValueOnce(rows);
    const where = vi.fn().mockReturnValue({ limit });
    mocks.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });
  }

  it("resuelve por username", async () => {
    mockSelect([[{ id: TARGET_ID }], []]);

    await expect(resolveUserByIdentifier("ana")).resolves.toBe(TARGET_ID);
  });

  it("resuelve por email (case-insensitive)", async () => {
    mockSelect([[], [{ id: TARGET_ID }]]);

    await expect(resolveUserByIdentifier("ANA@example.com")).resolves.toBe(TARGET_ID);
  });

  it("lanza USER_NOT_FOUND si no existe", async () => {
    mockSelect([[], []]);

    await expect(resolveUserByIdentifier("ghost")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});