import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  requirePermissionForUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({ db: { select: mocks.select, insert: mocks.insert, update: mocks.update } }));
vi.mock("@/services/auth/authorization", () => ({
  requirePermissionForUser: mocks.requirePermissionForUser,
}));

import { reportContent, resolveUserByIdentifier, updateReportStatus } from "./moderation";

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

beforeEach(() => vi.clearAllMocks());

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