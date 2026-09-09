import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { getProfileInRotation } from "./in-rotation";

// Mock de db agnóstico a la forma de la cadena (mismo patrón que
// stats.test.ts / album-favorites.test.ts): cualquier terminal awaitable
// resuelve a `rowsByTable[<nombre de la primera tabla del from>]`.
const rowsByTable: Record<string, unknown[]> = {};

const mocks = vi.hoisted(() => ({ select: vi.fn(), getProfileByUsername: vi.fn() }));

vi.mock("@/db", () => ({ db: { select: mocks.select } }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: mocks.getProfileByUsername,
}));

function chainFor() {
  let table = "";
  const resolved = () => Promise.resolve(rowsByTable[table] ?? []);
  const step: unknown = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "from") {
          return (t: unknown) => {
            table = getTableName(t as Parameters<typeof getTableName>[0]);
            return step;
          };
        }
        if (prop === "then") return resolved().then.bind(resolved());
        if (prop === "catch") return resolved().catch.bind(resolved());
        if (prop === "finally") return resolved().finally.bind(resolved());
        return () => step;
      },
    },
  );
  return step;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const followerProfile = {
  id: "owner",
  username: "ana",
  profileVisibility: "public" as const,
  relation: "following" as const,
  blockedByMe: false,
  accessible: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(rowsByTable)) delete rowsByTable[key];
  mocks.select.mockImplementation(() => chainFor());
  mocks.getProfileByUsername.mockResolvedValue(followerProfile);
});

describe("getProfileInRotation — acceso y audiencia", () => {
  it("devuelve null cuando el perfil no es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      ...followerProfile,
      accessible: false,
      relation: "none",
    });
    await expect(getProfileInRotation("ana", "viewer")).resolves.toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it("devuelve null cuando no hay señales de diario en la ventana", async () => {
    rowsByTable.listen_entry = [];
    await expect(getProfileInRotation("ana", "viewer")).resolves.toBeNull();
  });

  it("la consulta de señales filtra por las audiencias visibles del lector", async () => {
    // El seguidor ve followers+public; el servicio pasa esas audiencias a la
    // query — acá basta comprobar que la sección se computa (la fila mockeada
    // representa lo ya filtrado por SQL).
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(2), recordingId: "s1", releaseGroupId: null },
      { createdAt: daysAgo(2), recordingId: "s1", releaseGroupId: null },
    ];
    rowsByTable.recording = [{ id: "s1", title: "Song 1", artistName: "A" }];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.songs).toEqual([{ id: "s1", title: "Song 1", artistName: "A" }]);
  });
});

describe("getProfileInRotation — score de canciones", () => {
  it("una canción escuchada esta semana con score suficiente aparece", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(1), recordingId: "s1", releaseGroupId: null },
    ];
    rowsByTable.recording = [{ id: "s1", title: "Recent", artistName: "A" }];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.songs.map((s) => s.id)).toEqual(["s1"]);
  });

  it("actividad de más de 30 días no cuenta", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(40), recordingId: "s1", releaseGroupId: null },
      { createdAt: daysAgo(35), recordingId: "s1", releaseGroupId: null },
    ];
    rowsByTable.recording = [{ id: "s1", title: "Old", artistName: "A" }];
    await expect(getProfileInRotation("ana", "viewer")).resolves.toBeNull();
  });

  it("una sola escucha residual (22–30 d) no alcanza el umbral", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(25), recordingId: "s1", releaseGroupId: null },
    ];
    rowsByTable.recording = [{ id: "s1", title: "Residual", artistName: "A" }];
    await expect(getProfileInRotation("ana", "viewer")).resolves.toBeNull();
  });

  it("la recencia domina sobre el volumen antiguo", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(3), recordingId: "fresh", releaseGroupId: null }, // 3
      { createdAt: daysAgo(28), recordingId: "stale", releaseGroupId: null }, // 1
      { createdAt: daysAgo(27), recordingId: "stale", releaseGroupId: null }, // 1
    ];
    rowsByTable.recording = [
      { id: "fresh", title: "Fresh", artistName: "A" },
      { id: "stale", title: "Stale", artistName: "A" },
    ];
    const result = await getProfileInRotation("ana", "viewer");
    // fresh (score 3) supera umbral y aparece; stale (score 2) no.
    expect(result?.songs.map((s) => s.id)).toEqual(["fresh"]);
  });
});

describe("getProfileInRotation — score de álbumes", () => {
  it("un registro explícito de álbum de esta semana entra (peso ×2)", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(2), recordingId: null, releaseGroupId: "rg1" }, // 3 * 2 = 6
    ];
    rowsByTable.release_group = [
      { id: "rg1", title: "Album", coverThumbUrl: null, artistName: "A" },
    ];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.albums.map((a) => a.id)).toEqual(["rg1"]);
    expect(result?.songs).toEqual([]);
  });

  it("dos registros explícitos de álbum pesan más que tres canciones distintas por roll-up", async () => {
    rowsByTable.listen_entry = [
      // rgExplicit: 2 album_listen a 15 d → 2 * 2 * 2 = 8
      { createdAt: daysAgo(15), recordingId: null, releaseGroupId: "rgExplicit" },
      { createdAt: daysAgo(15), recordingId: null, releaseGroupId: "rgExplicit" },
      // rgRollup: 3 canciones distintas → 3 * 1 = 3
      { createdAt: daysAgo(2), recordingId: "c1", releaseGroupId: null },
      { createdAt: daysAgo(2), recordingId: "c2", releaseGroupId: null },
      { createdAt: daysAgo(2), recordingId: "c3", releaseGroupId: null },
    ];
    rowsByTable.track = [
      { recordingId: "c1", releaseGroupId: "rgRollup", firstReleaseDate: "2001-01-01", firstReleaseYear: 2001 },
      { recordingId: "c2", releaseGroupId: "rgRollup", firstReleaseDate: "2001-01-01", firstReleaseYear: 2001 },
      { recordingId: "c3", releaseGroupId: "rgRollup", firstReleaseDate: "2001-01-01", firstReleaseYear: 2001 },
    ];
    rowsByTable.recording = [
      { id: "c1", title: "C1", artistName: "A" },
      { id: "c2", title: "C2", artistName: "A" },
      { id: "c3", title: "C3", artistName: "A" },
    ];
    rowsByTable.release_group = [
      { id: "rgExplicit", title: "Explicit", coverThumbUrl: null, artistName: "A" },
      { id: "rgRollup", title: "Rollup", coverThumbUrl: null, artistName: "A" },
    ];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.albums.map((a) => a.id)).toEqual(["rgExplicit", "rgRollup"]);
  });

  it("repetir la misma canción 6× no mete su álbum en rotación", async () => {
    rowsByTable.listen_entry = Array.from({ length: 6 }, () => ({
      createdAt: daysAgo(2),
      recordingId: "loop",
      releaseGroupId: null,
    }));
    rowsByTable.track = [
      { recordingId: "loop", releaseGroupId: "rgLoop", firstReleaseDate: "2010-01-01", firstReleaseYear: 2010 },
    ];
    rowsByTable.recording = [{ id: "loop", title: "Loop", artistName: "A" }];
    rowsByTable.release_group = [
      { id: "rgLoop", title: "Loop Album", coverThumbUrl: null, artistName: "A" },
    ];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.songs.map((s) => s.id)).toEqual(["loop"]); // la canción sí
    expect(result?.albums).toEqual([]); // el álbum no (roll-up plano = 1 < 3)
  });

  it("tres canciones distintas del mismo álbum de estudio lo meten en rotación", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(10), recordingId: "x1", releaseGroupId: null },
      { createdAt: daysAgo(10), recordingId: "x2", releaseGroupId: null },
      { createdAt: daysAgo(10), recordingId: "x3", releaseGroupId: null },
    ];
    rowsByTable.track = [
      { recordingId: "x1", releaseGroupId: "rgX", firstReleaseDate: "1995-06-01", firstReleaseYear: 1995 },
      { recordingId: "x2", releaseGroupId: "rgX", firstReleaseDate: "1995-06-01", firstReleaseYear: 1995 },
      { recordingId: "x3", releaseGroupId: "rgX", firstReleaseDate: "1995-06-01", firstReleaseYear: 1995 },
    ];
    rowsByTable.recording = [
      { id: "x1", title: "X1", artistName: "A" },
      { id: "x2", title: "X2", artistName: "A" },
      { id: "x3", title: "X3", artistName: "A" },
    ];
    rowsByTable.release_group = [
      { id: "rgX", title: "X", coverThumbUrl: "c", artistName: "A" },
    ];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.albums).toEqual([
      { id: "rgX", title: "X", artistName: "A", coverThumbUrl: "c" },
    ]);
    // Cada canción suelta (score 2) no llega al umbral 3.
    expect(result?.songs).toEqual([]);
  });

  it("desambiguación del roll-up: elige el álbum de estudio de primer lanzamiento más temprano", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(2), recordingId: "d1", releaseGroupId: null },
      { createdAt: daysAgo(2), recordingId: "d2", releaseGroupId: null },
      { createdAt: daysAgo(2), recordingId: "d3", releaseGroupId: null },
    ];
    rowsByTable.track = [
      // cada canción está en el original (1994) y en un compilado (2010)
      { recordingId: "d1", releaseGroupId: "comp", firstReleaseDate: "2010-01-01", firstReleaseYear: 2010 },
      { recordingId: "d1", releaseGroupId: "orig", firstReleaseDate: "1994-03-01", firstReleaseYear: 1994 },
      { recordingId: "d2", releaseGroupId: "orig", firstReleaseDate: "1994-03-01", firstReleaseYear: 1994 },
      { recordingId: "d3", releaseGroupId: "comp", firstReleaseDate: "2010-01-01", firstReleaseYear: 2010 },
      { recordingId: "d3", releaseGroupId: "orig", firstReleaseDate: "1994-03-01", firstReleaseYear: 1994 },
    ];
    rowsByTable.recording = [
      { id: "d1", title: "D1", artistName: "A" },
      { id: "d2", title: "D2", artistName: "A" },
      { id: "d3", title: "D3", artistName: "A" },
    ];
    rowsByTable.release_group = [
      { id: "orig", title: "Original", coverThumbUrl: null, artistName: "A" },
      { id: "comp", title: "Compilation", coverThumbUrl: null, artistName: "A" },
    ];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.albums.map((a) => a.id)).toEqual(["orig"]);
  });
});

describe("getProfileInRotation — forma del resultado", () => {
  it("sólo canciones: el bloque de álbumes queda vacío", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(1), recordingId: "s1", releaseGroupId: null },
    ];
    rowsByTable.track = []; // sin mapeo a álbum de estudio
    rowsByTable.recording = [{ id: "s1", title: "S1", artistName: null }];
    const result = await getProfileInRotation("ana", "viewer");
    expect(result).toEqual({
      songs: [{ id: "s1", title: "S1", artistName: null }],
      albums: [],
    });
  });

  it("ambos bloques vacíos tras aplicar el umbral → null", async () => {
    rowsByTable.listen_entry = [
      { createdAt: daysAgo(25), recordingId: "s1", releaseGroupId: null }, // score 1
    ];
    rowsByTable.recording = [{ id: "s1", title: "S1", artistName: null }];
    await expect(getProfileInRotation("ana", "viewer")).resolves.toBeNull();
  });

  it("corta cada bloque a ROTATION_MAX_PER_TYPE", async () => {
    rowsByTable.listen_entry = Array.from({ length: 12 }, (_, i) => ({
      createdAt: daysAgo(1),
      recordingId: `s${i}`,
      releaseGroupId: null,
    }));
    rowsByTable.recording = Array.from({ length: 12 }, (_, i) => ({
      id: `s${i}`,
      title: `S${i}`,
      artistName: null,
    }));
    const result = await getProfileInRotation("ana", "viewer");
    expect(result?.songs).toHaveLength(8);
  });
});

describe("getProfileInRotation — independencia de la opinión", () => {
  it("el módulo no importa las tablas de valoración / favorito / reseña del esquema", () => {
    const source = readFileSync(
      join(process.cwd(), "src/services/profiles/in-rotation.ts"),
      "utf8",
    );
    const schemaImports = source.match(/import\s*\{([^}]*)\}\s*from\s*"@\/db\/schema"/)?.[1] ?? "";
    const identifiers = schemaImports
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/)[0])
      .filter(Boolean);
    expect(identifiers).not.toContain("rating");
    expect(identifiers).not.toContain("favorite");
    expect(identifiers).not.toContain("review");
  });
});
