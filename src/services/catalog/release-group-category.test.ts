import { describe, expect, it } from "vitest";
import { planCategoryUpdates } from "./release-group-category";

const stored = [
  { id: "a", mbid: "m-demos", title: "Studio Demos", category: "studio" },
  { id: "b", mbid: "m-uyi", title: "Use Your Illusion I", category: "studio" },
  { id: "c", mbid: "m-live", title: "Live Era", category: "live_other" },
  { id: "d", mbid: "m-unknown", title: "Sin datos", category: "studio" },
];

describe("planCategoryUpdates", () => {
  it("reclasifica solo los discos cuya categoría cambia con la regla vigente", () => {
    const updates = planCategoryUpdates(stored, [
      { mbid: "m-demos", primaryType: "Album", secondaryTypes: ["Demo"] },
      { mbid: "m-uyi", primaryType: "Album", secondaryTypes: [] },
      { mbid: "m-live", primaryType: "Album", secondaryTypes: ["Live"] },
    ]);
    expect(updates).toEqual([{ id: "a", mbid: "m-demos", title: "Studio Demos", from: "studio", to: "live_other" }]);
  });

  it("no toca discos sin tipos conocidos", () => {
    expect(planCategoryUpdates(stored, [])).toEqual([]);
  });
});
