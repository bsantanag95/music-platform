import { describe, expect, it } from "vitest";
import { coverFields } from "./cover-resolution";

describe("coverFields", () => {
  it("una URL conocida viaja resuelta", () => {
    expect(coverFields({ coverThumbUrl: "u", coverCheckedAt: null, coverBlockedAt: null })).toEqual({
      coverThumbUrl: "u",
      coverResolved: true,
    });
  });

  it("una carátula retirada viaja como null, resuelta", () => {
    expect(coverFields({ coverThumbUrl: "u", coverCheckedAt: null, coverBlockedAt: new Date() })).toEqual({
      coverThumbUrl: null,
      coverResolved: true,
    });
  });

  it("sin comprobar queda sin resolver: el cliente la pide", () => {
    expect(coverFields({ coverThumbUrl: null, coverCheckedAt: null, coverBlockedAt: null })).toEqual({
      coverThumbUrl: null,
      coverResolved: false,
    });
  });
});
