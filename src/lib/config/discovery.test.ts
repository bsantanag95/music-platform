import { afterEach, describe, expect, it, vi } from "vitest";
import { isExploreEnabled } from "./discovery";

describe("isExploreEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("respeta el override explícito", () => {
    vi.stubEnv("EXPLORE_ENABLED", "1");
    expect(isExploreEnabled()).toBe(true);
    vi.stubEnv("EXPLORE_ENABLED", "0");
    expect(isExploreEnabled()).toBe(false);
    vi.stubEnv("EXPLORE_ENABLED", "false");
    expect(isExploreEnabled()).toBe(false);
  });

  it("sin la variable: encendido fuera de producción, apagado en producción", () => {
    vi.stubEnv("EXPLORE_ENABLED", undefined);
    vi.stubEnv("NODE_ENV", "development");
    expect(isExploreEnabled()).toBe(true);
    vi.stubEnv("NODE_ENV", "production");
    expect(isExploreEnabled()).toBe(false);
  });
});
