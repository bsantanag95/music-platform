import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { alias } from "drizzle-orm/pg-core";
import { appUser } from "@/db/schema";
import { activeUserCondition, DEACTIVATED_AUTHOR, maskAuthor } from "./account-status";

const dialect = new PgDialect();

describe("activeUserCondition", () => {
  it("es `app_user.deactivated_at IS NULL`", () => {
    expect(dialect.sqlToQuery(activeUserCondition()).sql).toBe('"app_user"."deactivated_at" is null');
  });

  it("acepta un alias de app_user (p. ej. la persona seguida de un evento)", () => {
    const followed = alias(appUser, "followed_user");
    expect(dialect.sqlToQuery(activeUserCondition(followed)).sql).toBe('"followed_user"."deactivated_at" is null');
  });
});

describe("maskAuthor", () => {
  const base = { id: "u1", username: "ana", displayName: "Ana" };

  it("una cuenta activa conserva su nombre y usuario", () => {
    expect(maskAuthor({ ...base, deactivatedAt: null })).toEqual({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      deactivated: false,
    });
  });

  it("una cuenta desactivada no entrega ni usuario ni nombre, solo el identificador y la marca", () => {
    const masked = maskAuthor({ ...base, deactivatedAt: new Date("2026-09-01") });
    expect(masked).toEqual({ id: "u1", username: "", displayName: null, deactivated: true });
    expect(JSON.stringify(masked)).not.toContain("ana");
    expect(JSON.stringify(masked)).not.toContain("Ana");
    expect(masked).toMatchObject(DEACTIVATED_AUTHOR);
  });

  it("una fila sin la columna cuenta como activa (nunca enmascara por error)", () => {
    const masked = maskAuthor({ ...base } as never);
    expect(masked.deactivated).toBe(false);
    expect(masked.username).toBe("ana");
  });

  it("un autor sin usuario (unión externa vacía) queda con usuario vacío, no null", () => {
    expect(maskAuthor({ id: "u1", username: null, displayName: null, deactivatedAt: null }).username).toBe("");
  });
});
