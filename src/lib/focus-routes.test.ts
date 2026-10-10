import { describe, expect, it } from "vitest";
import { isFocusRoute } from "./focus-routes";

describe("isFocusRoute", () => {
  it("reconoce la bienvenida", () => {
    expect(isFocusRoute("/welcome")).toBe(true);
    expect(isFocusRoute("/welcome/")).toBe(true);
  });

  it("no confunde rutas que solo empiezan igual ni el resto del sitio", () => {
    expect(isFocusRoute("/welcomed")).toBe(false);
    expect(isFocusRoute("/")).toBe(false);
    expect(isFocusRoute("/me/welcome")).toBe(false);
    expect(isFocusRoute("/auth/register")).toBe(false);
  });
});
