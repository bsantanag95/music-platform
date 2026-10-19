import { describe, expect, it } from "vitest";
import { parseProgressTab, progressHref, progressTabFromLegacyCaminos } from "./progress-tabs";

describe("progress-tabs", () => {
  it("parsea las tres pestañas y cae a discographies", () => {
    expect(parseProgressTab("lists")).toBe("lists");
    expect(parseProgressTab("following")).toBe("following");
    expect(parseProgressTab(undefined)).toBe("discographies");
    expect(parseProgressTab("otra")).toBe("discographies");
    expect(parseProgressTab(["lists"])).toBe("discographies");
  });

  it("traduce la pestaña de /me/caminos a la de /me/progress", () => {
    expect(progressTabFromLegacyCaminos("mine")).toBe("lists");
    expect(progressTabFromLegacyCaminos("tracked")).toBe("following");
    expect(progressTabFromLegacyCaminos(undefined)).toBe("lists");
    expect(progressTabFromLegacyCaminos("otra")).toBe("lists");
  });

  it("arma el enlace con ?tab=", () => {
    expect(progressHref("following")).toBe("/me/progress?tab=following");
  });
});
