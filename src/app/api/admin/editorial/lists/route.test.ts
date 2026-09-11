import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  createEditorialDraft: vi.fn(),
  listEditorialLists: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/lists/editorial", () => ({
  createEditorialDraft: mocks.createEditorialDraft,
  listEditorialLists: mocks.listEditorialLists,
}));

beforeEach(() => vi.clearAllMocks());

describe("POST borradores editoriales", () => {
  it("rechaza a quien no tiene permiso de autoría", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ entityType: "release-group", title: "Clásicos" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("crea un borrador con body válido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });
    mocks.createEditorialDraft.mockResolvedValue({ id: "list-1" });

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ entityType: "release-group", title: "Clásicos" }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.author");
    expect(mocks.createEditorialDraft).toHaveBeenCalledWith("person-1", {
      entityType: "release-group",
      title: "Clásicos",
    });
  });

  it("rechaza un body inválido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });

    const response = await POST(
      new NextRequest("http://localhost", {
        method: "POST",
        body: JSON.stringify({ entityType: "invalido", title: "" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createEditorialDraft).not.toHaveBeenCalled();
  });
});

describe("GET listas editoriales", () => {
  it("pasa el filtro de estado válido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });
    mocks.listEditorialLists.mockResolvedValue([]);

    const response = await GET(new NextRequest("http://localhost/api/admin/editorial/lists?status=draft"));

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.author");
    expect(mocks.listEditorialLists).toHaveBeenCalledWith("draft");
  });

  it("ignora un estado inválido", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });
    mocks.listEditorialLists.mockResolvedValue([]);

    await GET(new NextRequest("http://localhost/api/admin/editorial/lists?status=cualquiera"));

    expect(mocks.listEditorialLists).toHaveBeenCalledWith(undefined);
  });
});
