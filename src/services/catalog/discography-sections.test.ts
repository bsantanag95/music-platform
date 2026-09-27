import { describe, expect, it } from "vitest";
import { discographySection, type DiscographySectionInput } from "./discography-sections";
import pinkFloydPage1 from "../musicbrainz/__fixtures__/pink-floyd-release-group-browse-page1.json";
import pinkFloydPage2 from "../musicbrainz/__fixtures__/pink-floyd-release-group-browse-page2.json";
import pinkFloydPage3 from "../musicbrainz/__fixtures__/pink-floyd-release-group-browse-page3.json";

const PINK_FLOYD_MBID = "83d91898-7763-47d7-b03b-b92132375c47";

function section(overrides: Partial<DiscographySectionInput>) {
  return discographySection({
    primaryType: "Album",
    secondaryTypes: [],
    category: "studio",
    creditRole: "primary",
    ...overrides,
  });
}

describe("discographySection", () => {
  it("un disco de estudio va a Principal", () => {
    expect(section({})).toBe("main");
  });

  it("un EP sin secundarios va a Principal, no a Sencillos", () => {
    expect(section({ primaryType: "EP", category: "single_ep" })).toBe("main");
  });

  it("la banda sonora de la propia banda sigue en Principal", () => {
    expect(section({ secondaryTypes: ["Soundtrack"] })).toBe("main");
  });

  it("figurar como invitado manda a Apariciones, aunque no haya secundarios", () => {
    expect(section({ primaryType: "Single", category: "single_ep", creditRole: "featured" })).toBe("appearances");
  });

  it("Compilation gana a Live y a los tipos de Otros", () => {
    expect(section({ secondaryTypes: ["Compilation", "Live"], category: "compilation" })).toBe("compilations");
    expect(section({ primaryType: "EP", secondaryTypes: ["Compilation"], category: "compilation" })).toBe("compilations");
  });

  it("Live va a En vivo, también un sencillo en vivo", () => {
    expect(section({ secondaryTypes: ["Live"], category: "live_other" })).toBe("live");
    expect(section({ primaryType: "Single", secondaryTypes: ["Live"], category: "live_other" })).toBe("live");
  });

  it("un remix, un demo o una entrevista van a Otros", () => {
    expect(section({ primaryType: "Single", secondaryTypes: ["Remix"], category: "single_ep" })).toBe("other");
    expect(section({ secondaryTypes: ["Demo"] })).toBe("other");
    expect(section({ primaryType: "Other", secondaryTypes: ["Interview"], category: "live_other" })).toBe("other");
  });

  it("un sencillo va a Sencillos, también si es de una banda sonora", () => {
    expect(section({ primaryType: "Single", category: "single_ep" })).toBe("singles");
    expect(section({ primaryType: "Single", secondaryTypes: ["Soundtrack"], category: "single_ep" })).toBe("singles");
  });

  it("Broadcast, Other o sin tipo van a Otros", () => {
    expect(section({ primaryType: "Broadcast", category: "live_other" })).toBe("other");
    expect(section({ primaryType: "Other", category: "live_other" })).toBe("other");
    expect(section({ primaryType: null, secondaryTypes: [], category: "live_other" })).toBe("other");
  });

  it("una fila anterior sin tipos se clasifica desde su categoría", () => {
    const legacy = { primaryType: null, secondaryTypes: null } as const;
    expect(section({ ...legacy, category: "studio" })).toBe("main");
    expect(section({ ...legacy, category: "single_ep" })).toBe("singles");
    expect(section({ ...legacy, category: "compilation" })).toBe("compilations");
    expect(section({ ...legacy, category: "live_other" })).toBe("live");
  });

  it("con la discografía oficial real de Pink Floyd, Principal reúne estudio, EP y bandas sonoras", () => {
    const groups = [pinkFloydPage1, pinkFloydPage2, pinkFloydPage3].flatMap((page) => page["release-groups"]);
    const sections = groups.map((rg) => ({
      title: rg.title,
      section: discographySection({
        primaryType: rg["primary-type"] ?? null,
        secondaryTypes: rg["secondary-types"] ?? [],
        category: "studio",
        creditRole: rg["artist-credit"][0]?.artist.id === PINK_FLOYD_MBID ? "primary" : "featured",
      }),
    }));
    const counts: Record<string, number> = {};
    for (const { section: key } of sections) counts[key] = (counts[key] ?? 0) + 1;

    expect(groups).toHaveLength(219);
    // 13 `Album` + 3 `EP` + 3 bandas sonoras (`Album`/`EP` + `Soundtrack`).
    expect(counts).toEqual({ main: 19, live: 95, compilations: 40, singles: 48, other: 16, appearances: 1 });
    const main = sections.filter((s) => s.section === "main").map((s) => s.title);
    expect(main).toEqual(expect.arrayContaining(["More", "Obscured by Clouds", "The Dark Side of the Moon"]));
  });
});
