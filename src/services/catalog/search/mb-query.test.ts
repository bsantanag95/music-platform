import { describe, expect, it } from "vitest";
import {
  artistQuery,
  escapeLucene,
  recordingFieldQuery,
  recordingFreeQuery,
  releaseGroupFieldQuery,
  releaseGroupQuery,
} from "./mb-query";

describe("escapeLucene", () => {
  it("escapa la sintaxis de Lucene", () => {
    expect(escapeLucene("AC/DC")).toBe("AC\\/DC");
    expect(escapeLucene("What?!")).toBe("What\\?\\!");
    expect(escapeLucene("(Love) + Hate")).toBe("\\(Love\\) \\+ Hate");
  });
});

describe("artistQuery", () => {
  it("texto libre sin filtro", () => {
    expect(artistQuery(" sabrina carpenter ")).toBe("sabrina carpenter");
  });

  it("filtro por tipo", () => {
    expect(artistQuery("dokken", "person")).toBe("(dokken) AND type:person");
  });
});

describe("releaseGroupQuery", () => {
  it("texto libre sin filtros", () => {
    expect(releaseGroupQuery("kiss destroyer")).toBe("kiss destroyer");
  });

  it("filtros de categoría y década", () => {
    expect(releaseGroupQuery("destroyer", { category: "studio", decade: 1970 })).toBe(
      "(destroyer) AND (primarytype:album AND NOT secondarytype:(compilation OR live)) AND firstreleasedate:[1970 TO 1979-12-31]",
    );
    expect(releaseGroupQuery("destroyer", { category: "compilation" })).toBe(
      "(destroyer) AND (secondarytype:compilation)",
    );
  });

  it("campos explícitos para el separador", () => {
    expect(releaseGroupFieldQuery("KISS", "Destroyer")).toBe(
      'releasegroup:"Destroyer" AND artist:"KISS"',
    );
    expect(releaseGroupFieldQuery("A \"B\"", "C", { decade: 1980 })).toBe(
      'releasegroup:"C" AND artist:"A \\"B\\"" AND firstreleasedate:[1980 TO 1989-12-31]',
    );
  });
});

describe("recording queries", () => {
  it("texto libre y campos explícitos", () => {
    expect(recordingFreeQuery("kiss of death")).toBe("kiss of death");
    expect(recordingFieldQuery("Dokken", "Kiss of Death")).toBe(
      'recording:"Kiss of Death" AND artist:"Dokken"',
    );
  });
});
