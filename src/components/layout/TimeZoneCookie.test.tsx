import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { TimeZoneCookie } from "./TimeZoneCookie";

function clearCookie() {
  document.cookie = "tz=; path=/; max-age=0";
}

describe("TimeZoneCookie", () => {
  afterEach(() => {
    clearCookie();
    vi.restoreAllMocks();
  });

  function mockZone(timeZone: string) {
    const original = Intl.DateTimeFormat.prototype.resolvedOptions;
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
      return { ...original.call(this), timeZone };
    });
  }

  it("guarda la zona horaria del navegador en la cookie tz", () => {
    mockZone("America/Santiago");
    render(<TimeZoneCookie />);
    expect(document.cookie).toContain("tz=America%2FSantiago");
  });

  it("no reescribe la cookie si ya tiene la misma zona", () => {
    mockZone("America/Santiago");
    document.cookie = "tz=America%2FSantiago; path=/";
    const setter = vi.spyOn(document, "cookie", "set");
    render(<TimeZoneCookie />);
    expect(setter).not.toHaveBeenCalled();
  });
});
