import { describe, expect, it } from "vitest";
import { GROUP_AWARDS_ON_HUB, awardGroup, groupAwards } from "./award-groups";

describe("agrupación del hub de premios", () => {
  it("está apagada mientras haya pocos premios", () => {
    expect(GROUP_AWARDS_ON_HUB).toBe(false);
  });

  it("asigna un grupo a cada premio cargado y `other` a uno desconocido", () => {
    expect(awardGroup("grammy")).toBe("general");
    expect(awardGroup("lo-nuestro")).toBe("latin");
    expect(awardGroup("mercury-prize")).toBe("critics");
    expect(awardGroup("premio-nuevo")).toBe("other");
  });

  it("agrupa en el orden de los grupos, conserva el orden recibido y omite los grupos vacíos", () => {
    const awards = ["mercury-prize", "latin-grammy", "grammy", "brit-awards"].map((awardSlug) => ({ awardSlug }));
    expect(groupAwards(awards)).toEqual([
      { group: "general", awards: [{ awardSlug: "grammy" }, { awardSlug: "brit-awards" }] },
      { group: "latin", awards: [{ awardSlug: "latin-grammy" }] },
      { group: "critics", awards: [{ awardSlug: "mercury-prize" }] },
    ]);
  });
});
