import { describe, expect, it } from "vitest";
import { decadeLabel } from "./decade-label";

describe("decadeLabel", () => {
  it.each([
    [1890, "Años 1890"],
    [1900, "Años 1900"],
    [1910, "Años 1910"],
    [1920, "Años 20"],
    [1950, "Años 50"],
    [1990, "Años 90"],
    [2000, "Años 2000"],
    [2020, "Años 2020"],
  ])("en español %i se llama %s", (decade, label) => {
    expect(decadeLabel(decade, "es")).toBe(label);
  });

  it.each([1890, 1900, 1980, 2000, 2020])("en inglés %i se llama %is", (decade) => {
    expect(decadeLabel(decade, "en")).toBe(`${decade}s`);
  });

  it("dos décadas no comparten nombre en español", () => {
    const decades = Array.from({ length: 24 }, (_, i) => 1890 + i * 10);
    const labels = decades.map((decade) => decadeLabel(decade, "es"));

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("acepta una variante regional del idioma", () => {
    expect(decadeLabel(1980, "es-CL")).toBe("Años 80");
  });
});
