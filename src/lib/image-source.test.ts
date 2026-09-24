import { describe, it, expect, afterEach } from "vitest";
import { isPreprocessedImageSrc } from "./image-source";

describe("isPreprocessedImageSrc", () => {
  const original = process.env.STORAGE_PUBLIC_DOMAIN;

  afterEach(() => {
    if (original === undefined) delete process.env.STORAGE_PUBLIC_DOMAIN;
    else process.env.STORAGE_PUBLIC_DOMAIN = original;
  });

  it("es verdadero para rutas /uploads/ del driver local", () => {
    expect(isPreprocessedImageSrc("/uploads/avatar/x.webp")).toBe(true);
  });

  it("es verdadero para el dominio público del storage (con o sin esquema)", () => {
    process.env.STORAGE_PUBLIC_DOMAIN = "https://cdn.example.com";
    expect(isPreprocessedImageSrc("https://cdn.example.com/covers/x.webp")).toBe(true);

    process.env.STORAGE_PUBLIC_DOMAIN = "cdn.example.com";
    expect(isPreprocessedImageSrc("https://cdn.example.com/covers/x.webp")).toBe(true);
  });

  it("es falso para Cover Art Archive y archive.org", () => {
    process.env.STORAGE_PUBLIC_DOMAIN = "https://cdn.example.com";
    expect(isPreprocessedImageSrc("https://coverartarchive.org/release-group/x/front-250")).toBe(false);
    expect(isPreprocessedImageSrc("https://archive.org/download/x.jpg")).toBe(false);
    expect(isPreprocessedImageSrc("https://dn123.ca.archive.org/x.jpg")).toBe(false);
  });

  it("es falso para dominios desconocidos", () => {
    process.env.STORAGE_PUBLIC_DOMAIN = "https://cdn.example.com";
    expect(isPreprocessedImageSrc("https://otro.example.org/x.webp")).toBe(false);
  });

  it("es falso para un dominio que solo contiene el del storage como prefijo engañoso", () => {
    process.env.STORAGE_PUBLIC_DOMAIN = "storage.example.com";
    expect(isPreprocessedImageSrc("https://storage.example.evil.com/x.webp")).toBe(false);
  });

  it("es falso sin dominio configurado", () => {
    delete process.env.STORAGE_PUBLIC_DOMAIN;
    expect(isPreprocessedImageSrc("https://cdn.example.com/x.webp")).toBe(false);
    expect(isPreprocessedImageSrc("/uploads/x.webp")).toBe(true);
  });

  it("es falso para un src vacío o que no es URL absoluta", () => {
    process.env.STORAGE_PUBLIC_DOMAIN = "https://cdn.example.com";
    expect(isPreprocessedImageSrc("")).toBe(false);
    expect(isPreprocessedImageSrc("covers/x.webp")).toBe(false);
  });
});
