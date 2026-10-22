import { describe, expect, it } from "vitest";
import { parseTimeZone } from "./time-zone";

describe("parseTimeZone", () => {
  it("acepta zonas IANA con nombre y devuelve su forma canónica", () => {
    expect(parseTimeZone("America/Santiago")).toBe("America/Santiago");
    expect(parseTimeZone("UTC")).toBe("UTC");
    expect(parseTimeZone("Etc/GMT+3")).toBe("Etc/GMT+3");
    expect(parseTimeZone("America/Argentina/Buenos_Aires")).not.toBeNull();
  });

  it.each([null, undefined, "", "Marte/Base", "+03:00", "-0300", "America/Santiago; DROP", "x".repeat(70)])(
    "rechaza %s",
    (value) => {
      expect(parseTimeZone(value)).toBeNull();
    },
  );
});
