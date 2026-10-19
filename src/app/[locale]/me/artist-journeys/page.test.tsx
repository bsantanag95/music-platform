import { describe, expect, it, vi } from "vitest";
import ArtistJourneysPage from "./page";

const mocks = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (...a: unknown[]) => mocks.redirect(...a) }));
vi.mock("next-intl/server", () => ({ getLocale: vi.fn().mockResolvedValue("en") }));

describe("ArtistJourneysPage (redirección)", () => {
  it("va a la pestaña Discografías del panel de progreso", async () => {
    await ArtistJourneysPage();
    expect(mocks.redirect).toHaveBeenCalledWith("/en/me/progress?tab=discographies");
  });
});
