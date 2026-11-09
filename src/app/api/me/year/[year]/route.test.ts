// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";
const mocks = vi.hoisted(() => ({ user: vi.fn(), save: vi.fn(), clear: vi.fn(), hide: vi.fn(), show: vi.fn() }));

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.user }));
vi.mock("@/lib/request-time-zone", () => ({ requestTimeZone: async () => "America/Santiago" }));
vi.mock("@/services/laminas/year", () => ({
  YEAR_TOP_SIZE: 5,
  parseYear: (value: string) => (/^\d{4}$/.test(value) && Number(value) >= 2000 && Number(value) <= 2100 ? Number(value) : null),
  saveYearTop: mocks.save,
  clearYearTop: mocks.clear,
  hideYearDisc: mocks.hide,
  showYearDisc: mocks.show,
}));

import { DELETE as clearTop, PUT as saveTop } from "./top/route";
import { DELETE as show, POST as hide } from "./hidden/[id]/route";

const req = (method: string, body?: unknown) =>
  new NextRequest("http://localhost/api/me/year/2026", { method, body: body === undefined ? undefined : JSON.stringify(body), headers: { "content-type": "application/json" } });
const year = (value = "2026") => ({ params: Promise.resolve({ year: value }) });
const disc = (value = ID) => ({ params: Promise.resolve({ year: "2026", id: value }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "u1" });
});

describe("/api/me/year/[year]", () => {
  it("guarda el Top 5 en la zona del dueño", async () => {
    expect((await saveTop(req("PUT", { releaseGroupIds: [ID] }), year())).status).toBe(204);
    expect(mocks.save).toHaveBeenCalledWith("u1", 2026, [ID], "America/Santiago");
  });

  it.each([
    ["vacío", { releaseGroupIds: [] }],
    ["de seis", { releaseGroupIds: Array(6).fill(ID) }],
    ["con un id inválido", { releaseGroupIds: ["x"] }],
  ])("rechaza un Top 5 %s", async (_label, body) => {
    expect((await saveTop(req("PUT", body), year())).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("propaga la validación del servicio", async () => {
    mocks.save.mockRejectedValue(new ApiError("VALIDATION_ERROR", 400, "x"));
    expect((await saveTop(req("PUT", { releaseGroupIds: [ID] }), year())).status).toBe(400);
  });

  it("vuelve al prellenado", async () => {
    expect((await clearTop(req("DELETE"), year())).status).toBe(204);
    expect(mocks.clear).toHaveBeenCalledWith("u1", 2026);
  });

  it("oculta y muestra un disco", async () => {
    expect((await hide(req("POST"), disc())).status).toBe(204);
    expect(mocks.hide).toHaveBeenCalledWith("u1", 2026, ID, "America/Santiago");
    expect((await show(req("DELETE"), disc())).status).toBe(204);
    expect(mocks.show).toHaveBeenCalledWith("u1", 2026, ID);
  });

  it("un año o un disco inválidos", async () => {
    expect((await saveTop(req("PUT", { releaseGroupIds: [ID] }), year("1999"))).status).toBe(404);
    expect((await hide(req("POST"), disc("x"))).status).toBe(400);
  });
});
