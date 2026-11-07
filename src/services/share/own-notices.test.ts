// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import en from "../../../messages/en/share.json";
import es from "../../../messages/es/share.json";

// `own.ts` lee la base y arma objetivos: acá solo importa la lista de tipos propios.
vi.mock("@/db", () => ({ db: {} }));

import { OWN_SHARE_KINDS } from "./own";

describe("avisos de lo propio", () => {
  it.each([
    ["es", es],
    ["en", en],
  ] as const)("cada tipo propio tiene su aviso en %s", (_locale, messages) => {
    const notices = messages.own.notice as Record<string, string>;
    for (const kind of OWN_SHARE_KINDS) expect(notices[kind], kind).toBeTruthy();
  });
});
