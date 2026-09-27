import { describe, expect, it } from "vitest";
import pinkFloydEntity from "./__fixtures__/pink-floyd-entity.json";
import pinkFloydImage from "./__fixtures__/pink-floyd-imageinfo.json";
import pinkFloydExtractEs from "./__fixtures__/pink-floyd-extract-es.json";
import pinkFloydPlace from "./__fixtures__/pink-floyd-place.json";
import kuervosImage from "./__fixtures__/kuervos-del-sur-imageinfo.json";
import monLaferteEntity from "./__fixtures__/mon-laferte-entity.json";
import monLafertePlace from "./__fixtures__/mon-laferte-place.json";
import monLaferteImage from "./__fixtures__/mon-laferte-imageinfo.json";
import {
  composePlaceLabel,
  countryIdOf,
  decidePhoto,
  isAllowedLicense,
  photoFileOf,
  placeIdOf,
  plainText,
  summaryOf,
} from "./mappers";
import type { CommonsImageInfoResponse, WDEntity, WPExtractResponse } from "./types";

const PF = (pinkFloydEntity.entities as Record<string, WDEntity>).Q2306;
const ML = (monLaferteEntity.entities as Record<string, WDEntity>).Q2836528;

describe("entidad de Wikidata", () => {
  it("lee la foto (P18) y el lugar de formación de un grupo (P740)", () => {
    expect(photoFileOf(PF)).toBe("Pink Floyd, 1971 (HQ).jpg");
    expect(placeIdOf(PF, "group")).toBe("Q84");
  });

  it("para una persona usa el lugar de nacimiento (P19) y su país (P17)", () => {
    expect(placeIdOf(ML, "person")).toBe("Q184345");
    const place = (monLafertePlace.entities as Record<string, WDEntity>).Q184345;
    expect(countryIdOf(place)).toBe("Q298");
  });

  it("con el tipo desconocido (stub) prueba el lugar de nacimiento y después el de formación", () => {
    expect(placeIdOf(ML, "unknown")).toBe("Q184345");
    expect(placeIdOf(PF, "unknown")).toBe("Q84");
  });

  it("prefiere el rango preferido e ignora los desaprobados", () => {
    const entity: WDEntity = {
      id: "Q1",
      claims: {
        P18: [
          { mainsnak: { datavalue: { value: "vieja.jpg" } }, rank: "deprecated" },
          { mainsnak: { datavalue: { value: "normal.jpg" } }, rank: "normal" },
          { mainsnak: { datavalue: { value: "preferida.jpg" } }, rank: "preferred" },
        ],
      },
    };
    expect(photoFileOf(entity)).toBe("preferida.jpg");
  });

  it("el país de Londres es el Reino Unido (preferido), no el Imperio romano (histórico)", () => {
    const place = (pinkFloydPlace.entities as Record<string, WDEntity>).Q84;
    expect(countryIdOf(place)).toBe("Q145");
  });

  it("sin rango preferido, un país vigente gana a uno con fecha de fin", () => {
    const place: WDEntity = {
      id: "Q1",
      claims: {
        P17: [
          { mainsnak: { datavalue: { value: { id: "Q-historico" } } }, rank: "normal", qualifiers: { P582: [{}] } },
          { mainsnak: { datavalue: { value: { id: "Q-actual" } } }, rank: "normal" },
        ],
      },
    };
    expect(countryIdOf(place)).toBe("Q-actual");
  });

  it("compone el lugar con su país sin repetirlo", () => {
    expect(composePlaceLabel("Viña del Mar", "Chile")).toBe("Viña del Mar, Chile");
    expect(composePlaceLabel("Chile", "Chile")).toBe("Chile");
    expect(composePlaceLabel(null, "Chile")).toBeNull();
  });
});

describe("resumen de Wikipedia", () => {
  it("devuelve la introducción con título y URL", () => {
    const summary = summaryOf(pinkFloydExtractEs as WPExtractResponse);
    expect(summary?.title).toBe("Pink Floyd");
    expect(summary?.summary.startsWith("Pink Floyd fue una banda de rock británica")).toBe(true);
    expect(summary?.url).toBe("https://es.wikipedia.org/wiki/Pink_Floyd");
  });

  it("una página inexistente no tiene resumen", () => {
    expect(summaryOf({ query: { pages: [{ title: "X", missing: true }] } })).toBeNull();
  });
});

describe("foto de Commons", () => {
  it("acepta dominio público con su autor", () => {
    const decision = decidePhoto("Pink Floyd, 1971 (HQ).jpg", pinkFloydImage as CommonsImageInfoResponse);
    expect(decision).toMatchObject({
      status: "accepted",
      photo: { license: "Public domain", author: "Capitol Records", sourceUrl: expect.stringContaining("commons.wikimedia.org/wiki/File:") },
    });
  });

  it("acepta CC BY-SA con el autor en texto plano y el enlace a la licencia", () => {
    const decision = decidePhoto("Kuervos del Sur.jpg", kuervosImage as CommonsImageInfoResponse);
    expect(decision).toMatchObject({
      status: "accepted",
      photo: {
        license: "CC BY-SA 4.0",
        author: "Carolina Marlene Gatica Molina",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
        url: expect.stringContaining("500px-"),
      },
    });
  });

  it("acepta CC BY 2.0 de Flickr y limpia el HTML del autor", () => {
    const decision = decidePhoto("x.jpg", monLaferteImage as CommonsImageInfoResponse);
    expect(decision.status === "accepted" && decision.photo.author).toBe("Secretaría de Cultura Ciudad de México from México");
  });

  it("rechaza un archivo marcado como no libre", () => {
    const nonFree: CommonsImageInfoResponse = {
      query: {
        pages: [
          {
            title: "File:x.jpg",
            imageinfo: [
              {
                thumburl: "https://upload.wikimedia.org/x.jpg",
                descriptionurl: "https://commons.wikimedia.org/wiki/File:x.jpg",
                extmetadata: { LicenseShortName: { value: "Fair use" }, NonFree: { value: "true" } },
              },
            ],
          },
        ],
      },
    };
    expect(decidePhoto("x.jpg", nonFree)).toEqual({ status: "rejected", license: "Fair use" });
  });

  it("rechaza sin licencia declarada o con NC/ND", () => {
    const without: CommonsImageInfoResponse = {
      query: { pages: [{ title: "File:x.jpg", imageinfo: [{ thumburl: "u", descriptionurl: "d", extmetadata: {} }] }] },
    };
    expect(decidePhoto("x.jpg", without).status).toBe("rejected");
    expect(isAllowedLicense("CC BY-NC-SA 2.0")).toBe(false);
    expect(isAllowedLicense("CC BY-ND 4.0")).toBe(false);
    expect(isAllowedLicense("CC0")).toBe(true);
    expect(isAllowedLicense("CC BY 3.0")).toBe(true);
  });

  it("un archivo borrado cuenta como faltante", () => {
    expect(decidePhoto("x.jpg", { query: { pages: [{ title: "File:x.jpg", missing: true }] } })).toEqual({ status: "missing" });
  });

  it("plainText decodifica entidades y recorta", () => {
    expect(plainText('<a href="#">Juan &amp; Ana</a>')).toBe("Juan & Ana");
    expect(plainText("")).toBeNull();
  });
});
