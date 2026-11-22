// @vitest-environment node
import { describe, expect, it } from "vitest";
import { judgeSmokeDb, parseDbUrl, parseEnvFile } from "./env";

describe("parseEnvFile", () => {
  it("lee claves, ignora comentarios y quita comillas", () => {
    const env = parseEnvFile("# nota\nA=1\nB=\"dos\"\n\nC='tres'\nsin-igual\n");
    expect(env).toEqual({ A: "1", B: "dos", C: "tres" });
  });
});

describe("parseDbUrl", () => {
  it("extrae host, puerto y nombre sin exponer la contraseña", () => {
    const id = parseDbUrl("postgres://u:secreto@localhost:5433/music_platform_scratch");
    expect(id).toEqual({ host: "localhost", port: "5433", database: "music_platform_scratch" });
    expect(JSON.stringify(id)).not.toContain("secreto");
  });
  it("devuelve null si falta o es inválida", () => {
    expect(parseDbUrl(undefined)).toBeNull();
    expect(parseDbUrl("no-es-url")).toBeNull();
    expect(parseDbUrl("postgres://u:p@localhost:5432/")).toBeNull();
  });
});

describe("judgeSmokeDb", () => {
  it("permite nombres de BD desechables", () => {
    for (const name of ["music_platform_scratch", "scratch", "mp_test", "app-ci", "tmp_db"]) {
      expect(judgeSmokeDb(`postgres://u:p@h:1/${name}`).allowed).toBe(true);
    }
  });
  it("rechaza la BD real y explica cómo corregirlo", () => {
    const v = judgeSmokeDb("postgres://u:p@h:1/music_platform");
    expect(v.allowed).toBe(false);
    expect(v.reason).toContain("scratch");
    expect(v.database).toBe("music_platform");
  });
  it("no confunde subcadenas: 'contest' y 'latest' no son 'test'", () => {
    expect(judgeSmokeDb("postgres://u:p@h:1/contest").allowed).toBe(false);
    expect(judgeSmokeDb("postgres://u:p@h:1/latest_data").allowed).toBe(false);
  });
  it("falla cerrado si no puede determinar la BD", () => {
    expect(judgeSmokeDb(undefined).allowed).toBe(false);
    expect(judgeSmokeDb("basura").allowed).toBe(false);
  });
  it("acepta un nombre autorizado explícitamente", () => {
    expect(judgeSmokeDb("postgres://u:p@h:1/music_platform", ["music_platform"]).allowed).toBe(true);
  });
});
