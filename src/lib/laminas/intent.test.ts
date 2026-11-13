import { describe, expect, it } from "vitest";
import {
  buildIntentAuthHref,
  buildIntentDestination,
  buildIntentQuery,
  laminaBuildHref,
  normalizeBuildIntent,
  parseBuildIntent,
  parseLaminaIntent,
} from "./intent";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";
const ARTIST = "10000000-0000-4000-8000-000000000001";

describe("parseLaminaIntent", () => {
  it("acepta un identificador", () => {
    expect(parseLaminaIntent(ID)).toBe(ID);
    expect(parseLaminaIntent(ID.toUpperCase())).toBe(ID);
  });

  it.each([["https://otro.example"], ["//otro.example"], [`${ID}/../..`], [`${ID}&x=1`], [""], [null], [undefined], [[ID]]])("descarta %j", (value) => {
    expect(parseLaminaIntent(value)).toBeNull();
  });
});

describe("parseBuildIntent", () => {
  it("lee una Lámina o una discografía", () => {
    expect(parseBuildIntent({ lamina: ID })).toEqual({ kind: "lamina", id: ID });
    expect(parseBuildIntent({ discografia: ARTIST })).toEqual({ kind: "discography", artistId: ARTIST });
  });

  it("con las dos, manda la Lámina", () => {
    expect(parseBuildIntent({ lamina: ID, discografia: ARTIST })).toEqual({ kind: "lamina", id: ID });
  });

  it("un valor inválido se descarta", () => {
    expect(parseBuildIntent({ discografia: "https://otro.example" })).toBeNull();
    expect(parseBuildIntent({})).toBeNull();
  });
});

describe("normalizeBuildIntent", () => {
  it("revalida lo guardado", () => {
    expect(normalizeBuildIntent({ kind: "discography", artistId: ARTIST })).toEqual({ kind: "discography", artistId: ARTIST });
    expect(normalizeBuildIntent({ kind: "discography", artistId: "//x" })).toBeNull();
    expect(normalizeBuildIntent({ kind: "otro", id: ID })).toBeNull();
    expect(normalizeBuildIntent("lamina")).toBeNull();
  });
});

describe("rutas", () => {
  it("el destino lo arma el código, con el usuario autenticado", () => {
    expect(laminaBuildHref(ID)).toBe(`/me/cards?desde=${ID}`);
    expect(buildIntentDestination({ kind: "lamina", id: ID }, "ana")).toBe(`/me/cards?desde=${ID}`);
    expect(buildIntentDestination({ kind: "discography", artistId: ARTIST }, "ana b")).toBe(`/users/ana%20b/artist/${ARTIST}?valorar=1`);
  });

  it("registro y login conservan la intención solo si la hay", () => {
    expect(buildIntentAuthHref("/auth/register", { kind: "lamina", id: ID })).toBe(`/auth/register?lamina=${ID}`);
    expect(buildIntentAuthHref("/auth/login", { kind: "discography", artistId: ARTIST })).toBe(`/auth/login?discografia=${ARTIST}`);
    expect(buildIntentAuthHref("/auth/login", null)).toBe("/auth/login");
    expect(buildIntentQuery(null)).toBe("");
  });
});

describe("intención de año (ADR 0055)", () => {
  it("acepta un año entre 2000 y 2100 y lleva al año propio", () => {
    expect(parseBuildIntent({ anio: "2026" })).toEqual({ kind: "year", year: 2026 });
    expect(buildIntentDestination({ kind: "year", year: 2026 }, "ana b")).toBe("/users/ana%20b/year/2026");
    expect(buildIntentAuthHref("/auth/register", { kind: "year", year: 2026 })).toBe("/auth/register?anio=2026");
  });

  it.each(["1850", "2101", "abc", "2026.5", "", "20260", "/users/otra/year/2026"])("descarta %s", (anio) => {
    expect(parseBuildIntent({ anio })).toBeNull();
  });

  it("manda la de Lámina y después la de discografía", () => {
    expect(parseBuildIntent({ lamina: ID, anio: "2026" })).toEqual({ kind: "lamina", id: ID });
    expect(parseBuildIntent({ discografia: ARTIST, anio: "2026" })).toEqual({ kind: "discography", artistId: ARTIST });
  });

  it("se revalida al volver de Google", () => {
    expect(normalizeBuildIntent({ kind: "year", year: 2026 })).toEqual({ kind: "year", year: 2026 });
    expect(normalizeBuildIntent({ kind: "year", year: 1999 })).toBeNull();
    expect(normalizeBuildIntent({ kind: "year", year: "x" })).toBeNull();
  });
});
