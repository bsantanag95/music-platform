import { describe, expect, it } from "vitest";
import {
  artistQuery,
  escapeLucene,
  recordingFieldQuery,
  recordingFreeQuery,
  releaseGroupFieldQuery,
  releaseGroupQuery,
  withRecordingFilters,
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
    expect(artistQuery("dokken", { artistType: "person" })).toBe("(dokken) AND type:person");
  });

  it("filtros de país, inicio de actividad y estado", () => {
    expect(artistQuery("soda", { country: ["AR"], beginFrom: 1980, beginTo: 1989 })).toBe(
      "(soda) AND country:(AR) AND begin:[1980 TO 1989-12-31]",
    );
    expect(artistQuery("nirvana", { artistType: "group", ended: true })).toBe("(nirvana) AND type:group AND ended:true");
    expect(artistQuery("x", { beginFrom: 1990 })).toBe("(x) AND begin:[1990 TO *]");
    expect(artistQuery("x", { beginTo: 1960, ended: false })).toBe("(x) AND begin:[* TO 1960-12-31] AND ended:false");
  });

  it("sin nombre: solo campos; varios países, ciudad sin acentos y nombre exacto", () => {
    expect(artistQuery("", { artistType: "group", country: ["CL", "AR"], beginFrom: 1980, beginTo: 1989 })).toBe(
      "type:group AND country:(CL OR AR) AND begin:[1980 TO 1989-12-31]",
    );
    expect(artistQuery("", { area: "Valparaíso" })).toBe('beginarea:"Valparaiso"');
    expect(artistQuery("Kiss", { exact: true })).toBe('artist:"Kiss"');
    expect(artistQuery('AC/DC "x"', { exact: true, country: ["AU"] })).toBe('(artist:"AC/DC \\"x\\"") AND country:(AU)');
  });
});

describe("releaseGroupQuery", () => {
  it("texto libre sin filtros", () => {
    expect(releaseGroupQuery("kiss destroyer")).toBe("kiss destroyer");
  });

  it("filtros de categoría y década", () => {
    expect(releaseGroupQuery("destroyer", { categories: ["studio"], decade: 1970 })).toBe(
      '(destroyer) AND (primarytype:album AND NOT secondarytype:(compilation OR live OR spokenword OR interview OR audiobook OR "audio drama" OR remix OR "dj-mix" OR "mixtape/street" OR demo OR "field recording")) AND firstreleasedate:[1970 TO 1979-12-31]',
    );
    // Un demo o un remix publicados como álbum caen en "en vivo y otros".
    expect(releaseGroupQuery("destroyer", { categories: ["live_other"] })).toContain(
      '(primarytype:album AND secondarytype:(spokenword OR interview OR audiobook OR "audio drama" OR remix OR "dj-mix" OR "mixtape/street" OR demo OR "field recording"))',
    );
    expect(releaseGroupQuery("destroyer", { categories: ["compilation"] })).toBe(
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

  it("rango de años y artista", () => {
    expect(releaseGroupQuery("iron maiden", { yearFrom: 1983, yearTo: 1986 })).toBe(
      "(iron maiden) AND firstreleasedate:[1983 TO 1986-12-31]",
    );
    // El rango reemplaza a la década.
    expect(releaseGroupQuery("kiss", { decade: 1970, yearFrom: 1980 })).toBe("(kiss) AND firstreleasedate:[1980 TO *]");
    expect(releaseGroupQuery("greatest hits", { categories: ["compilation"], artist: "Queen" })).toBe(
      '(greatest hits) AND (secondarytype:compilation) AND artist:"Queen"',
    );
    expect(releaseGroupQuery("back in black", { artist: 'AC/DC "live"' })).toBe(
      '(back in black) AND artist:"AC/DC \\"live\\""',
    );
  });

  it("sin título, título exacto y varias categorías", () => {
    expect(releaseGroupQuery("", { artist: "Iron Maiden", yearFrom: 1983, yearTo: 1986, categories: ["compilation"] })).toBe(
      '(secondarytype:compilation) AND firstreleasedate:[1983 TO 1986-12-31] AND artist:"Iron Maiden"',
    );
    expect(releaseGroupQuery("Powerslave", { exact: true })).toBe('releasegroup:"Powerslave"');
    expect(releaseGroupQuery("", { categories: ["compilation", "single_ep"] })).toBe(
      "((secondarytype:compilation) OR (primarytype:(single OR ep) AND NOT secondarytype:(compilation OR live)))",
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

  it("filtro de duración en milisegundos", () => {
    expect(withRecordingFilters("hallelujah", { durMax: 420 })).toBe("(hallelujah) AND dur:[* TO 420999]");
    expect(withRecordingFilters("hallelujah", { durMin: 60, durMax: 420 })).toBe(
      "(hallelujah) AND dur:[60000 TO 420999]",
    );
    expect(withRecordingFilters("hallelujah")).toBe("hallelujah");
  });

  it("álbum y tipos; sin título, solo campos", () => {
    expect(withRecordingFilters("", { album: "Grace" })).toBe('release:"Grace"');
    expect(withRecordingFilters('artist:"Jeff Buckley"', { album: "Grace", categories: ["compilation"], durMax: 420 })).toBe(
      '(artist:"Jeff Buckley") AND release:"Grace" AND (secondarytype:compilation) AND dur:[* TO 420999]',
    );
  });
});
