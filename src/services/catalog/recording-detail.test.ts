import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { getRecordingDetail } from "./recording-detail";

vi.mock("@/db", () => ({
  db: { select: vi.fn() },
}));

describe("getRecordingDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve not_found y no hace llamadas externas", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const limit = vi.fn().mockResolvedValue([]);
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit }),
      }),
    } as never);

    await expect(getRecordingDetail("00000000-0000-0000-0000-000000000001")).resolves.toEqual({
      kind: "not_found",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
