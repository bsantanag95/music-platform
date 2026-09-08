import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isExploreEnabled } from "./discovery";

describe("isExploreEnabled", () => {
  const original = { flag: process.env.EXPLORE_ENABLED, nodeEnv: process.env.NODE_ENV };

  beforeEach(() => {
    delete process.env.EXPLORE_ENABLED;
  });
  afterEach(() => {
    if (original.flag === undefined) delete process.env.EXPLORE_ENABLED;
    else process.env.EXPLORE_ENABLED = original.flag;
    process.env.NODE_ENV = original.nodeEnv;
  });

  it("respeta el override explícito", () => {
    process.env.EXPLORE_ENABLED = "1";
    expect(isExploreEnabled()).toBe(true);
    process.env.EXPLORE_ENABLED = "0";
    expect(isExploreEnabled()).toBe(false);
    process.env.EXPLORE_ENABLED = "false";
    expect(isExploreEnabled()).toBe(false);
  });

  it("sin la variable: encendido fuera de producción, apagado en producción", () => {
    process.env.NODE_ENV = "development";
    expect(isExploreEnabled()).toBe(true);
    process.env.NODE_ENV = "production";
    expect(isExploreEnabled()).toBe(false);
  });
});
