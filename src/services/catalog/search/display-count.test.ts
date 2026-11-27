import { describe, expect, it } from "vitest";
import { displayCount } from "./display-count";

describe("displayCount", () => {
  it("con total 0 y resultados listados, cuenta lo listado", () => {
    expect(displayCount(0, 8)).toBe(8);
  });

  it("sin total (MusicBrainz falló), cuenta lo listado", () => {
    expect(displayCount(null, 3)).toBe(3);
    expect(displayCount(undefined, 0)).toBe(0);
  });

  it("con un total mayor que la página, usa el total", () => {
    expect(displayCount(883675, 25)).toBe(883675);
  });
});
