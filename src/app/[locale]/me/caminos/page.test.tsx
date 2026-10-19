import { beforeEach, describe, expect, it, vi } from "vitest";
import CaminosPage from "./page";

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (...a: unknown[]) => mocks.redirect(...a) }));
vi.mock("next-intl/server", () => ({ getLocale: vi.fn().mockResolvedValue("es") }));

function run(searchParams: { tab?: string } = {}) {
  return CaminosPage({ searchParams: Promise.resolve(searchParams) });
}

describe("CaminosPage (redirección)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin ?tab= va a Mis listas", async () => {
    await run();
    expect(mocks.redirect).toHaveBeenCalledWith("/es/me/progress?tab=lists");
  });

  it("?tab=tracked va a Listas que sigo", async () => {
    await run({ tab: "tracked" });
    expect(mocks.redirect).toHaveBeenCalledWith("/es/me/progress?tab=following");
  });
});
