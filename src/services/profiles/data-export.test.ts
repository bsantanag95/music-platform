import { beforeEach, describe, expect, it, vi } from "vitest";

// `db.select(...).from(tabla)…` se resuelve con las filas encoladas para esa tabla,
// en el orden en que el servicio las pide (seguidores y seguidos usan la misma tabla).
const h = vi.hoisted(() => ({ rows: {} as Record<string, unknown[][]> }));

vi.mock("@/db", async () => {
  const { getTableName: name } = await import("drizzle-orm");
  function chain(table: () => string) {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const queue = h.rows[table()] ?? [];
          const result = Promise.resolve(queue.shift() ?? []);
          return result.then.bind(result);
        }
        return () => target;
      },
    });
    return target;
  }
  return {
    db: {
      select: () => {
        let table = "";
        const start: unknown = new Proxy(function () {}, {
          get(_t, prop) {
            if (prop === "from") {
              return (t: Parameters<typeof name>[0]) => {
                table = name(t);
                return chain(() => table);
              };
            }
            return () => start;
          },
        });
        return start;
      },
    },
  };
});

import { buildDataExport, DATA_EXPORT_VERSION } from "./data-export";

const user = {
  id: "u1",
  username: "ana",
  email: "ana@example.com",
  emailVerifiedAt: new Date("2026-01-02"),
  displayName: "Ana",
  passwordHash: "$argon2id$SECRETO",
  profileVisibility: "public",
  defaultAudience: null,
  locale: "es",
  bio: "hola",
  pronouns: null,
  pronounSet: "she",
  country: "CL",
  location: "Quilpué",
  timezone: "America/Santiago",
  showLocalTime: true,
  selfRoles: ["dj"],
  genres: ["jazz"],
  listeningFormats: ["vinyl"],
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  h.rows = {
    app_user: [[user]],
    listen_entry: [[{ id: "l1", userId: "u1", releaseGroupId: "rg1", body: "nota PRIVADA del diario", audience: "private" }]],
    rating: [[{ id: "r1", userId: "u1", releaseGroupId: "rg1", stars: "4.5" }]],
    artist: [[{ id: "a1", name: "Miles Davis" }]],
    release_group: [[{ id: "rg1", title: "Kind of Blue" }]],
    user_follow: [
      [{ username: "fran", deactivatedAt: null, status: "accepted" }],
      [
        { username: "pr", deactivatedAt: null, status: "accepted" },
        { username: "oculta", deactivatedAt: new Date("2026-09-01"), status: "accepted" },
      ],
    ],
    user_block: [[{ username: "molesto", deactivatedAt: null }]],
    artist_follow: [[{ id: "af1", userId: "u1", artistId: "a1" }]],
  };
});

describe("buildDataExport", () => {
  it("nunca incluye el hash de la contraseña, tokens ni sesiones", async () => {
    const text = JSON.stringify(await buildDataExport("u1"));
    expect(text).not.toContain("SECRETO");
    expect(text).not.toMatch(/passwordHash|password_hash|tokenHash|token_hash/);
    expect(text).not.toMatch(/session/i);
  });

  it("incluye los datos propios: cuenta, diario con la nota privada, valoraciones", async () => {
    const data = await buildDataExport("u1", new Date("2026-09-21T15:00:00Z"));
    expect(data.version).toBe(DATA_EXPORT_VERSION);
    expect(data.exportedAt).toBe("2026-09-21T15:00:00.000Z");
    expect(data.account).toMatchObject({ username: "ana", email: "ana@example.com", bio: "hola", selfRoles: ["dj"], genres: ["jazz"] });
    // Datos personales opcionales (spec profile-personal-info): la clave de pronombres, el
    // país y la ciudad o región salen en la cuenta.
    expect(data.account).toMatchObject({ pronounSet: "she", pronouns: null, country: "CL", location: "Quilpué" });
    expect(data.library.diary).toEqual([expect.objectContaining({ body: "nota PRIVADA del diario", audience: "private" })]);
    expect(data.activity.ratings).toHaveLength(1);
  });

  it("acompaña los identificadores del catálogo con sus nombres para poder leer el archivo", async () => {
    const data = await buildDataExport("u1");
    expect(data.catalog.releaseGroups).toEqual({ rg1: "Kind of Blue" });
    expect(data.catalog.artists).toEqual({ a1: "Miles Davis" });
  });

  it("los seguidores, seguidos y bloqueados salen como usuarios públicos, sin más datos de esas personas", async () => {
    const data = await buildDataExport("u1");
    expect(data.social.followers).toEqual([{ username: "fran", deactivated: false, status: "accepted" }]);
    expect(data.social.blocked).toEqual([{ username: "molesto", deactivated: false }]);
    for (const person of [...data.social.followers, ...data.social.following, ...data.social.blocked]) {
      expect(Object.keys(person).sort()).toEqual(expect.arrayContaining(["deactivated", "username"]));
      expect(person).not.toHaveProperty("email");
    }
  });

  it("una cuenta desactivada en la red de la persona se exporta sin su usuario", async () => {
    const data = await buildDataExport("u1");
    expect(data.social.following).toContainEqual({ username: null, deactivated: true, status: "accepted" });
    expect(JSON.stringify(data)).not.toContain("oculta");
  });

  it("USER_NOT_FOUND si la cuenta no existe", async () => {
    h.rows.app_user = [[]];
    await expect(buildDataExport("nadie")).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });
});

