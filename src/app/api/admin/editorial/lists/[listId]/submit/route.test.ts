import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  submitEditorialDraft: vi.fn(),
}));

vi.mock("@/services/auth/authorization", () => ({ requirePermission: mocks.requirePermission }));
vi.mock("@/services/lists/editorial", () => ({ submitEditorialDraft: mocks.submitEditorialDraft }));

const LIST_ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("POST proponer borrador editorial", () => {
  it("exige editorial.author", async () => {
    mocks.requirePermission.mockRejectedValue(new ApiError("ROLE_REQUIRED", 403, "Sin permiso"));

    const response = await POST(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ listId: LIST_ID }),
    });

    expect(response.status).toBe(403);
  });

  it("propone el borrador y responde ok", async () => {
    mocks.requirePermission.mockResolvedValue({ id: "person-1" });
    mocks.submitEditorialDraft.mockResolvedValue(undefined);

    const response = await POST(new NextRequest("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ listId: LIST_ID }),
    });

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("editorial.author");
  });
});
