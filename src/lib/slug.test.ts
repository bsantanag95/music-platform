import { describe, expect, it } from "vitest";
import {
  buildSegment,
  decodeId,
  encodeId,
  parseCatalogSegment,
  slugify,
  truncateSlug,
} from "./slug";

// El id es la verdad y el slug decorativo (openspec: add-catalog-slugs): la
// codificación base58 de 22 caracteres es canónica y la decodificación rechaza
// cualquier forma inválida en vez de resolver a otra entidad.

const UUID_ZERO = "00000000-0000-0000-0000-000000000000";
const UUID_ONE = "00000000-0000-0000-0000-000000000001";
const UUID_MAX = "ffffffff-ffff-ffff-ffff-ffffffffffff";
// Ejemplos de la propuesta y del diseño.
const PINK_FLOYD_SONG = "9504e7c5-da1f-475d-bcce-a64f6013772f";
const PINK_FLOYD_ARTIST = "93f1f6be-b1dc-42d0-abde-2850072d0774";

describe("encodeId / decodeId", () => {
  it("ida y vuelta con UUID aleatorios", () => {
    for (let i = 0; i < 200; i += 1) {
      const uuid = crypto.randomUUID();
      const encoded = encodeId(uuid);
      expect(encoded).toHaveLength(22);
      expect(decodeId(encoded)).toBe(uuid);
    }
  });

  it("ida y vuelta con ceros a la izquierda", () => {
    expect(encodeId(UUID_ZERO)).toBe("1111111111111111111111");
    expect(decodeId("1111111111111111111111")).toBe(UUID_ZERO);
    expect(decodeId(encodeId(UUID_ONE))).toBe(UUID_ONE);
  });

  it("ida y vuelta con el máximo", () => {
    expect(decodeId(encodeId(UUID_MAX))).toBe(UUID_MAX);
    expect(encodeId(UUID_MAX)).toHaveLength(22);
  });

  it("coincide con los ejemplos de la propuesta", () => {
    expect(encodeId(PINK_FLOYD_ARTIST)).toBe("KGbai8kbv81qoNbTiNhQ7m");
    expect(encodeId(PINK_FLOYD_SONG)).toBe("KQHie2Dgrb4CRpKj3vXDD8");
  });

  it("rechaza longitudes distintas de 22", () => {
    expect(decodeId("")).toBeNull();
    expect(decodeId("123")).toBeNull();
    expect(decodeId("111111111111111111111")).toBeNull();
    expect(decodeId("11111111111111111111111")).toBeNull();
  });

  it("rechaza caracteres fuera del alfabeto (0, O, I, l)", () => {
    expect(decodeId("1111111111111111111110")).toBeNull();
    expect(decodeId("111111111111111111111O")).toBeNull();
    expect(decodeId("111111111111111111111I")).toBeNull();
    expect(decodeId("111111111111111111111l")).toBeNull();
  });

  it("rechaza valores mayores o iguales que 2^128", () => {
    // 22 caracteres del alfabeto, pero por encima del máximo de 128 bits.
    expect(decodeId("zzzzzzzzzzzzzzzzzzzzzz")).toBeNull();
    expect(decodeId("kqhie2dgrb4crpkj3vxdd8")).toBeNull();
  });

  it("un id pasado a minúsculas no resuelve (base58 distingue mayúsculas)", () => {
    const encoded = encodeId(PINK_FLOYD_ARTIST);
    expect(encoded.toLowerCase()).not.toBe(encoded);
    expect(decodeId(encoded.toLowerCase())).toBeNull();
  });
});

describe("slugify", () => {
  it("sin diacríticos latinos ni puntuación", () => {
    expect(slugify("Mötley Crüe")).toBe("motley-crue");
    expect(slugify("Guns N' Roses")).toBe("guns-n-roses");
    expect(slugify("AC/DC")).toBe("ac-dc");
  });

  it("conserva las escrituras no latinas, sin transliterar", () => {
    expect(slugify("Кино")).toBe("кино");
    expect(slugify("宇多田ヒカル")).toBe("宇多田ヒカル");
    expect(slugify("방탄소년단")).toBe("방탄소년단");
  });

  it("recompone íntegro el kana con dakuten", () => {
    expect(slugify("ヴァイオリン")).toBe("ヴァイオリン");
    expect(slugify("がっこう")).toBe("がっこう");
  });

  it("un nombre solo de símbolos queda vacío", () => {
    expect(slugify("♪♫ !!!")).toBe("");
    expect(slugify("   ")).toBe("");
  });

  it("aplica el mapa de letras que no descomponen", () => {
    expect(slugify("Ørsted")).toBe("orsted");
    expect(slugify("Straße")).toBe("strasse");
    expect(slugify("Þing")).toBe("thing");
  });
});

describe("truncateSlug", () => {
  it("no corta un slug dentro del tope", () => {
    expect(truncateSlug("pink-floyd", 30)).toBe("pink-floyd");
  });

  it("corta en el último guion anterior al tope", () => {
    expect(truncateSlug("aa-bb-cc-dd", 8)).toBe("aa-bb-cc");
  });

  it("respeta el límite cuando el corte ya cae en un guion", () => {
    expect(truncateSlug("aa-bb-cc-dd", 5)).toBe("aa-bb");
  });

  it("una única palabra más larga que el tope se corta tal cual", () => {
    expect(truncateSlug("supercalifragilistic", 10)).toBe("supercalif");
  });

  it("el tope cuenta puntos de código, no unidades UTF-16", () => {
    expect(truncateSlug("日".repeat(40), 30)).toBe("日".repeat(30));
  });
});

describe("buildSegment / parseCatalogSegment", () => {
  it("ensambla slug e id", () => {
    expect(buildSegment("pink-floyd", PINK_FLOYD_ARTIST)).toBe(
      `pink-floyd-KGbai8kbv81qoNbTiNhQ7m`,
    );
  });

  it("sin slug el segmento es solo el id", () => {
    expect(buildSegment("", PINK_FLOYD_ARTIST)).toBe("KGbai8kbv81qoNbTiNhQ7m");
  });

  it("parsea un slug con guiones", () => {
    expect(parseCatalogSegment("pink-floyd-the-wall-KQHie2Dgrb4CRpKj3vXDD8")).toEqual({
      id: PINK_FLOYD_SONG,
      form: "encoded",
    });
  });

  it("parsea un segmento con solo el id", () => {
    expect(parseCatalogSegment("KQHie2Dgrb4CRpKj3vXDD8")).toEqual({
      id: PINK_FLOYD_SONG,
      form: "encoded",
    });
  });

  it("parsea el UUID hexadecimal del formato anterior", () => {
    expect(parseCatalogSegment(PINK_FLOYD_SONG)).toEqual({
      id: PINK_FLOYD_SONG,
      form: "legacy",
    });
    expect(parseCatalogSegment(PINK_FLOYD_SONG.toUpperCase())).toEqual({
      id: PINK_FLOYD_SONG,
      form: "legacy",
    });
  });

  it("rechaza segmentos sin id válido", () => {
    expect(parseCatalogSegment("pink-floyd")).toBeNull();
    expect(parseCatalogSegment("pink-floyd-abc")).toBeNull();
    expect(parseCatalogSegment("")).toBeNull();
  });
});
