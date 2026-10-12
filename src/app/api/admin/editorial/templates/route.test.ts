import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET } from "./route";
import { POST as pause } from "./[key]/pause/route";
import { POST as resume } from "./[key]/resume/route";
import { POST as run } from "./[key]/run/route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  listTemplatesAdmin: vi.fn(),
  pauseTemplate: vi.fn(),
  resumeTemplate: vi.fn(),
  runTemplateNow: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/discovery/featured", () => ({
  listTemplatesAdmin: mocks.listTemplatesAdmin,
  pauseTemplate: mocks.pauseTemplate,
  resumeTemplate: mocks.resumeTemplate,
  runTemplateNow: mocks.runTemplateNow,
}));

const context = { params: Promise.resolve({ key: "new-releases" }) };
const request = () => new NextRequest("http://localhost", { method: "POST" });

beforeEach(() => vi.clearAllMocks());

describe("plantillas de colecciones (consola editorial)", () => {
  it("GET exige solo editorial.author", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "curator-1" });
    mocks.listTemplatesAdmin.mockResolvedValue([]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.author");
  });

  it.each([
    ["pausar", pause, "pauseTemplate"],
    ["reanudar", resume, "resumeTemplate"],
    ["forzar", run, "runTemplateNow"],
  ] as const)("%s exige editorial.publish", async (_name, handler, service) => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));
    expect((await handler(request(), context)).status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.publish");
    expect(mocks[service]).not.toHaveBeenCalled();
  });

  it("pausa y reanuda con la clave de la plantilla", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    expect((await pause(request(), context)).status).toBe(200);
    expect(mocks.pauseTemplate).toHaveBeenCalledWith("admin-1", "new-releases");
    expect((await resume(request(), context)).status).toBe(200);
    expect(mocks.resumeTemplate).toHaveBeenCalledWith("admin-1", "new-releases");
  });

  it("forzar responde 202", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    const response = await run(request(), context);
    expect(response.status).toBe(202);
    expect(mocks.runTemplateNow).toHaveBeenCalledWith("admin-1", "new-releases");
  });

  it("propaga TEMPLATE_NOT_FOUND como 404", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "admin-1" });
    mocks.pauseTemplate.mockRejectedValue(new ApiError("TEMPLATE_NOT_FOUND", 404, "No existe"));
    const response = await pause(request(), { params: Promise.resolve({ key: "nope" }) });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: "TEMPLATE_NOT_FOUND" });
  });
});
