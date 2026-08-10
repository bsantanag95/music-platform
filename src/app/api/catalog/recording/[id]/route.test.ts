import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import * as recordingDetail from "@/services/catalog/recording-detail";

vi.mock("@/services/catalog/recording-detail", () => ({ getRecordingDetail: vi.fn() }));

describe("GET /api/catalog/recording/[id]", () => {
  it("rechaza ids que no son UUID", async () => {
    const response = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "bad" }),
    });

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");
    expect(recordingDetail.getRecordingDetail).not.toHaveBeenCalled();
  });

  it("devuelve RECORDING_NOT_FOUND", async () => {
    vi.mocked(recordingDetail.getRecordingDetail).mockResolvedValue({ kind: "not_found" });

    const response = await GET(new NextRequest("http://localhost"), {
      params: Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" }),
    });

    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("RECORDING_NOT_FOUND");
  });
});
