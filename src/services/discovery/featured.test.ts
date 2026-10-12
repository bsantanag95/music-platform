import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), transaction: vi.fn() },
  requirePermissionForUser: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/services/auth/authorization", () => ({ requirePermissionForUser: mocks.requirePermissionForUser }));
vi.mock("@/services/lists/editorial", () => ({ recordEditorialAction: vi.fn() }));

import {
  featureList,
  pauseTemplate,
  reorderFeatured,
  resumeTemplate,
  runTemplateNow,
  unfeatureList,
  updateFeaturedSchedule,
} from "./featured";

const LIST = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requirePermissionForUser.mockResolvedValue(undefined);
});

describe("escrituras de destacadas: permisos", () => {
  const denied = () => mocks.requirePermissionForUser.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

  it.each([
    ["featureList", () => featureList("u", LIST)],
    ["updateFeaturedSchedule", () => updateFeaturedSchedule("u", LIST, { weight: 1 })],
    ["unfeatureList", () => unfeatureList("u", LIST)],
    ["reorderFeatured", () => reorderFeatured("u", [LIST])],
    ["pauseTemplate", () => pauseTemplate("u", "new-releases")],
    ["resumeTemplate", () => resumeTemplate("u", "new-releases")],
    ["runTemplateNow", () => runTemplateNow("u", "new-releases")],
  ])("%s exige editorial.publish y no toca la BD sin él", async (_name, call) => {
    denied();

    await expect(call()).rejects.toMatchObject({ code: "ROLE_REQUIRED" });

    expect(mocks.requirePermissionForUser).toHaveBeenCalledWith("u", "editorial.publish");
    for (const method of Object.values(mocks.db)) expect(method).not.toHaveBeenCalled();
  });
});

describe("plantillas", () => {
  it.each([
    ["pauseTemplate", pauseTemplate],
    ["resumeTemplate", resumeTemplate],
    ["runTemplateNow", runTemplateNow],
  ] as const)("%s rechaza una clave desconocida con TEMPLATE_NOT_FOUND", async (_name, call) => {
    await expect(call("u", "no-existe")).rejects.toMatchObject({ code: "TEMPLATE_NOT_FOUND", status: 404 });
    expect(mocks.db.transaction).not.toHaveBeenCalled();
  });
});
