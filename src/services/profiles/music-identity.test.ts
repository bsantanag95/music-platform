import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    updates: [] as unknown[],
    updateResult: [{ selfRoles: [], genres: [], listeningFormats: [] }] as unknown[],
    deleteCount: 0,
    inserts: [] as unknown[],
    insertResult: [] as unknown[],
    selects: [] as unknown[][],
  };

  function chain(next: () => unknown): unknown {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve(next());
          return result.then.bind(result);
        }
        return () => target;
      },
    });
    return target;
  }

  const executor = {
    update: () => ({
      set: (value: unknown) => {
        state.updates.push(value);
        return chain(() => state.updateResult);
      },
    }),
    delete: () =>
      chain(() => {
        state.deleteCount += 1;
        return undefined;
      }),
    insert: () => ({
      values: (value: unknown) => {
        state.inserts.push(value);
        return chain(() => state.insertResult);
      },
    }),
    select: () => chain(() => state.selects.shift() ?? []),
  };
  const db = {
    ...executor,
    transaction: async (callback: (tx: typeof executor) => Promise<unknown>) => callback(executor),
  };
  return { state, db };
});

vi.mock("@/db", () => ({ db: h.db }));

import { listPrompts, replacePrompts, updateMusicIdentity } from "./music-identity";

const code = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? "OTHER";
  }
};

beforeEach(() => {
  h.state.updates = [];
  h.state.updateResult = [{ selfRoles: ["collector", "dj"], genres: ["jazz"], listeningFormats: ["vinyl"] }];
  h.state.deleteCount = 0;
  h.state.inserts = [];
  h.state.insertResult = [];
  h.state.selects = [];
});

describe("updateMusicIdentity", () => {
  it("guarda solo los campos enviados y devuelve el estado guardado", async () => {
    const result = await updateMusicIdentity("u1", { selfRoles: ["collector", "dj"] });
    expect(h.state.updates).toEqual([{ selfRoles: ["collector", "dj"] }]);
    expect(result).toEqual({ selfRoles: ["collector", "dj"], genres: ["jazz"], listeningFormats: ["vinyl"] });
  });

  it("un arreglo vacío vacía el campo", async () => {
    await updateMusicIdentity("u1", { genres: [] });
    expect(h.state.updates).toEqual([{ genres: [] }]);
  });

  it.each([
    ["un cuarto rol", { selfRoles: ["listener", "collector", "musician", "dj"] }],
    ["un rol desconocido", { selfRoles: ["admin"] }],
    ["un sexto género", { genres: ["rock", "punk", "jazz", "folk", "blues", "pop"] }],
    ["un género fuera de la lista", { genres: ["polka-espacial"] }],
    ["un formato desconocido", { listeningFormats: ["8-track"] }],
    ["repetidos", { genres: ["jazz", "jazz"] }],
    ["un cuerpo sin campos", {}],
  ])("rechaza %s sin tocar la base", async (_name, input) => {
    expect(await code(updateMusicIdentity("u1", input as never))).toBe("VALIDATION_ERROR");
    expect(h.state.updates).toHaveLength(0);
  });

  it("USER_NOT_FOUND si el update no afecta filas", async () => {
    h.state.updateResult = [];
    expect(await code(updateMusicIdentity("nadie", { genres: ["jazz"] }))).toBe("USER_NOT_FOUND");
  });
});

describe("replacePrompts", () => {
  it("reemplaza el conjunto completo y asigna la posición por el orden del array", async () => {
    h.state.insertResult = [
      { promptKey: "sunday-record", answer: "Kind of Blue", position: 1 },
      { promptKey: "first-record", answer: "Un casete de Los Prisioneros", position: 0 },
    ];

    const saved = await replacePrompts("u1", [
      { promptKey: "first-record", answer: "  Un casete de Los Prisioneros " },
      { promptKey: "sunday-record", answer: "Kind of Blue" },
    ]);

    expect(h.state.deleteCount).toBe(1);
    expect(h.state.inserts[0]).toEqual([
      { userId: "u1", promptKey: "first-record", answer: "Un casete de Los Prisioneros", position: 0 },
      { userId: "u1", promptKey: "sunday-record", answer: "Kind of Blue", position: 1 },
    ]);
    expect(saved.map((item) => item.position)).toEqual([0, 1]);
  });

  it("un conjunto vacío quita todas las preguntas sin insertar nada", async () => {
    expect(await replacePrompts("u1", [])).toEqual([]);
    expect(h.state.deleteCount).toBe(1);
    expect(h.state.inserts).toHaveLength(0);
  });

  it.each([
    ["una respuesta de 101 caracteres", [{ promptKey: "first-record", answer: "x".repeat(101) }]],
    ["una respuesta vacía o solo espacios", [{ promptKey: "first-record", answer: "   " }]],
    ["una respuesta con salto de línea", [{ promptKey: "first-record", answer: "una\ndos" }]],
    ["una pregunta fuera de la lista", [{ promptKey: "el-mejor-disco", answer: "x" }]],
    [
      "la misma pregunta dos veces",
      [
        { promptKey: "first-record", answer: "a" },
        { promptKey: "first-record", answer: "b" },
      ],
    ],
    [
      "una cuarta pregunta",
      [
        { promptKey: "first-record", answer: "a" },
        { promptKey: "sunday-record", answer: "b" },
        { promptKey: "defended-song", answer: "c" },
        { promptKey: "guilty-pleasure", answer: "d" },
      ],
    ],
  ])("rechaza %s sin tocar la base (el conjunto anterior no cambia)", async (_name, prompts) => {
    expect(await code(replacePrompts("u1", prompts as never))).toBe("VALIDATION_ERROR");
    expect(h.state.deleteCount).toBe(0);
    expect(h.state.inserts).toHaveLength(0);
  });

  it("acepta una respuesta de exactamente 100 caracteres", async () => {
    h.state.insertResult = [{ promptKey: "first-record", answer: "x".repeat(100), position: 0 }];
    const saved = await replacePrompts("u1", [{ promptKey: "first-record", answer: "x".repeat(100) }]);
    expect(saved).toHaveLength(1);
  });
});

describe("listPrompts", () => {
  it("devuelve las preguntas en el orden guardado", async () => {
    h.state.selects = [
      [
        { promptKey: "first-record", answer: "a", position: 0 },
        { promptKey: "sunday-record", answer: "b", position: 1 },
      ],
    ];
    expect((await listPrompts("u1")).map((item) => item.promptKey)).toEqual(["first-record", "sunday-record"]);
  });
});
