import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ getEditionExtraTracks: vi.fn() }));
vi.mock("@/services/catalog/album-editions", () => ({ getEditionExtraTracks: mocks.getEditionExtraTracks }));

const { GET } = await import("./route");

const RG = "550e8400-e29b-41d4-a716-446655440000";
const EDITION = "550e8400-e29b-41d4-a716-446655440001";

function call(id: string, editionId: string) {
  return GET(new NextRequest("http://localhost/x"), { params: Promise.resolve({ id, editionId }) });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/catalog/release-group/{id}/editions/{editionId}/extra-tracks", () => {
  it("devuelve las pistas adicionales", async () => {
    const tracks = [
      {
        recordingId: "550e8400-e29b-41d4-a716-446655440002",
        discNumber: 2,
        position: 1,
        title: "Money (Live)",
        durationSec: 400,
        variantType: "live",
      },
    ];
    mocks.getEditionExtraTracks.mockResolvedValue(tracks);

    const response = await call(RG, EDITION);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tracks });
    expect(mocks.getEditionExtraTracks).toHaveBeenCalledWith(RG, EDITION);
  });

  it("rechaza un UUID inválido sin consultar", async () => {
    const response = await call("no-uuid", EDITION);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(mocks.getEditionExtraTracks).not.toHaveBeenCalled();
  });

  it("una caja responde 422 EDITION_IS_BOX", async () => {
    mocks.getEditionExtraTracks.mockRejectedValue(new ApiError("EDITION_IS_BOX", 422, "caja"));
    const response = await call(RG, EDITION);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "EDITION_IS_BOX" });
  });

  it("una edición de otro álbum responde 404 EDITION_NOT_FOUND", async () => {
    mocks.getEditionExtraTracks.mockRejectedValue(new ApiError("EDITION_NOT_FOUND", 404, "no"));
    const response = await call(RG, EDITION);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "EDITION_NOT_FOUND" });
  });
});
