import { describe, expect, it } from "vitest";
import { UpdateOwnProfileRequestSchema, UpdateProfileIdentityRequestSchema } from "./schemas";

// Spec profile-personal-info: país y pronombres de lista cerrada, y los datos que NO se piden.

describe.each([
  ["UpdateProfileIdentityRequestSchema", UpdateProfileIdentityRequestSchema],
  ["UpdateOwnProfileRequestSchema", UpdateOwnProfileRequestSchema],
])("%s: país", (_name, schema) => {
  it.each(["CL", "ES", "XK", "", null])("acepta %j", (country) => {
    expect(schema.safeParse({ country }).success).toBe(true);
  });

  it.each(["cl", "Chile", "CHL", "ZZ", "C", 12])("rechaza %j", (country) => {
    expect(schema.safeParse({ country }).success).toBe(false);
  });

  it("recorta los espacios de los bordes antes de validar", () => {
    const parsed = schema.safeParse({ country: " CL " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect((parsed.data as { country: string }).country).toBe("CL");
  });
});

describe.each([
  ["UpdateProfileIdentityRequestSchema", UpdateProfileIdentityRequestSchema],
  ["UpdateOwnProfileRequestSchema", UpdateOwnProfileRequestSchema],
])("%s: pronombres", (_name, schema) => {
  it.each(["he", "she", "they"])("acepta la clave %s sin texto libre", (pronounSet) => {
    expect(schema.safeParse({ pronounSet }).success).toBe(true);
    expect(schema.safeParse({ pronounSet, pronouns: null }).success).toBe(true);
    expect(schema.safeParse({ pronounSet, pronouns: "" }).success).toBe(true);
  });

  it("«other» exige el texto en la misma petición", () => {
    expect(schema.safeParse({ pronounSet: "other", pronouns: "ellx" }).success).toBe(true);
    expect(schema.safeParse({ pronounSet: "other" }).success).toBe(false);
    expect(schema.safeParse({ pronounSet: "other", pronouns: "" }).success).toBe(false);
    expect(schema.safeParse({ pronounSet: "other", pronouns: "   " }).success).toBe(false);
    expect(schema.safeParse({ pronounSet: "other", pronouns: null }).success).toBe(false);
  });

  it("«other» respeta el máximo de 40 caracteres", () => {
    expect(schema.safeParse({ pronounSet: "other", pronouns: "x".repeat(40) }).success).toBe(true);
    expect(schema.safeParse({ pronounSet: "other", pronouns: "x".repeat(41) }).success).toBe(false);
  });

  it("una clave de la lista con texto libre es una combinación inválida", () => {
    expect(schema.safeParse({ pronounSet: "she", pronouns: "ellx" }).success).toBe(false);
  });

  it("null (sin especificar) no admite texto libre", () => {
    expect(schema.safeParse({ pronounSet: null }).success).toBe(true);
    expect(schema.safeParse({ pronounSet: null, pronouns: null }).success).toBe(true);
    expect(schema.safeParse({ pronounSet: null, pronouns: "ellx" }).success).toBe(false);
  });

  it("rechaza una clave fuera de la lista", () => {
    for (const pronounSet of ["xe", "She", "", "he/him", 3]) {
      expect(schema.safeParse({ pronounSet }).success, String(pronounSet)).toBe(false);
    }
  });

  it("un cliente anterior que solo envía `pronouns` sigue siendo válido (se trata como «Otro»)", () => {
    expect(schema.safeParse({ pronouns: "elle" }).success).toBe(true);
    expect(schema.safeParse({ pronouns: "" }).success).toBe(true);
  });
});

describe("datos personales que no se piden", () => {
  const notAsked = ["birthYear", "birthDate", "birthday", "age", "gender", "firstName", "lastName", "givenName", "familyName"];

  it.each(notAsked)("una petición que solo trae `%s` se rechaza: no hay nada que actualizar", (field) => {
    expect(UpdateOwnProfileRequestSchema.safeParse({ [field]: "x" }).success).toBe(false);
  });

  it("si vienen junto a un campo válido se descartan y nunca llegan al servicio", () => {
    const parsed = UpdateOwnProfileRequestSchema.safeParse({
      bio: "hola",
      birthYear: 1990,
      gender: "x",
      firstName: "Ana",
      lastName: "Pérez",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(Object.keys(parsed.data)).toEqual(["bio"]);
  });

  it("la edición de identidad tampoco los acepta", () => {
    const parsed = UpdateProfileIdentityRequestSchema.safeParse({ bio: "hola", birthDate: "1990-01-01", gender: "x" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(Object.keys(parsed.data)).toEqual(["bio"]);
  });
});
