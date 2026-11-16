import { describe, expect, it } from "vitest";
import { isBlockedState, privateState } from "./private-state";

describe("privateState", () => {
  it("resuelve el estado exacto de quien no tiene acceso", () => {
    const none = { relation: "none", blockedByMe: false } as const;
    expect(privateState(none, false, false)).toBe("anonymous");
    expect(privateState(none, true, false)).toBe("none");
    expect(privateState({ relation: "requested", blockedByMe: false }, true, false)).toBe("requested");
    expect(privateState({ relation: "incoming", blockedByMe: false }, true, false)).toBe("incoming");
    expect(privateState({ relation: "blocked", blockedByMe: true }, true, false)).toBe("blockedByMe");
    expect(privateState({ relation: "blocked", blockedByMe: false }, true, false)).toBe("blockedByThem");
    // "cómo te ven" gana sobre todo lo demás: el dueño ve lo que ve un anónimo.
    expect(privateState(none, true, true)).toBe("preview");
  });

  it("solo los dos bloqueos cuentan como bloqueo", () => {
    expect(isBlockedState("blockedByMe")).toBe(true);
    expect(isBlockedState("blockedByThem")).toBe(true);
    expect(isBlockedState("requested")).toBe(false);
  });
});
