import { describe, expect, it } from "vitest";
import { sourceSite } from "./source-site";

describe("sourceSite", () => {
  it("devuelve el host sin www", () => {
    expect(sourceSite("https://en.wikipedia.org/wiki/67th_Annual_Grammy_Awards")).toBe("en.wikipedia.org");
    expect(sourceSite("https://www.brits.co.uk/winners")).toBe("brits.co.uk");
  });

  it("sin URL, con una URL inválida o con otro protocolo no hay sitio", () => {
    expect(sourceSite(null)).toBeNull();
    expect(sourceSite("no es una url")).toBeNull();
    expect(sourceSite("javascript:alert(1)")).toBeNull();
  });
});
