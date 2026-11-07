import { describe, expect, it } from "vitest";
import { laminaAuthHref, laminaBuildHref, parseLaminaIntent } from "./intent";

const ID = "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f";

describe("parseLaminaIntent", () => {
  it("acepta un identificador", () => {
    expect(parseLaminaIntent(ID)).toBe(ID);
    expect(parseLaminaIntent(ID.toUpperCase())).toBe(ID);
  });

  it.each([["https://otro.example"], ["//otro.example"], [`${ID}/../..`], [`${ID}&x=1`], [""], [null], [undefined], [[ID]]])("descarta %j", (value) => {
    expect(parseLaminaIntent(value)).toBeNull();
  });
});

describe("rutas", () => {
  it("el destino es siempre la misma ruta", () => {
    expect(laminaBuildHref(ID)).toBe(`/me/laminas?desde=${ID}`);
  });

  it("registro y login conservan la intención solo si la hay", () => {
    expect(laminaAuthHref("/auth/register", ID)).toBe(`/auth/register?lamina=${ID}`);
    expect(laminaAuthHref("/auth/login", null)).toBe("/auth/login");
  });
});
