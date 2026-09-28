import { beforeEach, describe, expect, it, vi } from "vitest";

// Cola de resultados: cada `db.select()` toma el siguiente, en el orden en que se llama.
const queue = vi.hoisted(() => ({ results: [] as unknown[][] }));
const mocks = vi.hoisted(() => ({ readArtistDiscography: vi.fn() }));

vi.mock("@/db", () => {
  const chain = (result: unknown[]) => {
    const node: Record<string, unknown> = {};
    for (const method of ["from", "innerJoin", "leftJoin", "where", "limit"]) node[method] = () => node;
    node.then = (resolve: (value: unknown) => void) => resolve(result);
    return node;
  };
  return { db: { select: () => chain(queue.results.shift() ?? []) } };
});
vi.mock("./ingest-discography", () => ({ readArtistDiscography: mocks.readArtistDiscography }));

const { getArtistLineup } = await import("./artist-lineup");

const SYNCED = new Date("2026-09-01");

const person = (id: string, name: string, extra: Partial<{ lifeEnded: boolean; lifeEnd: string; lineupSyncedAt: Date | null; mbid: string | null }> = {}) => ({
  id,
  name,
  mbid: extra.mbid === undefined ? `mb-${id}` : extra.mbid,
  lifeEnded: extra.lifeEnded ?? null,
  lifeEnd: extra.lifeEnd ?? null,
  lineupSyncedAt: extra.lineupSyncedAt === undefined ? SYNCED : extra.lineupSyncedAt,
});

const period = (beginDate: string | null, endDate: string | null, instruments: string[], extra: { ended?: boolean; isFounder?: boolean } = {}) => ({
  periodId: `p-${Math.random()}`,
  beginDate,
  endDate,
  ended: extra.ended ?? endDate !== null,
  instruments,
  isFounder: extra.isFounder ?? false,
  isAdditional: false,
});

const NO_PERIOD = { periodId: null, beginDate: null, endDate: null, ended: null, instruments: null, isFounder: null, isAdditional: null };

beforeEach(() => {
  queue.results = [];
  vi.clearAllMocks();
});

describe("getArtistLineup de un grupo", () => {
  function queueGroup() {
    const vince = person("vince", "Vince Neil");
    const john5 = person("john5", "John 5");
    const randy = person("randy", "Randy Castillo", { lifeEnded: true, lifeEnd: "2002-03-26", lineupSyncedAt: null });
    const legacy = person("legacy", "Integrante viejo", { lineupSyncedAt: null });
    const maloney = person("maloney", "Samantha Maloney", { lineupSyncedAt: null });
    queue.results = [
      [{ id: "crue", type: "group", lifeEnded: false, lifeEnd: null }],
      [
        { person: vince, role: "lead vocals", joinedOn: null, leftOn: null, ...period("1981-01-17", "1992", ["lead vocals"], { isFounder: true }) },
        { person: vince, role: "lead vocals", joinedOn: null, leftOn: null, ...period("2018", null, ["lead vocals"], { isFounder: true }) },
        { person: john5, role: "guitar", joinedOn: "2022-10-27", leftOn: null, ...period("2022-10-27", null, ["guitar"]) },
        { person: randy, role: "drums (drum set)", joinedOn: "1999-01-01", leftOn: "2002-03-26", ...period("1999", "2002-03-26", ["drums (drum set)"]) },
        // Pertenencia sincronizada antes de la migración 0055: sin períodos.
        { person: legacy, role: "bass, original", joinedOn: null, leftOn: "1990-05-01", ...NO_PERIOD },
      ],
      [{ person: maloney, beginDate: "2000", endDate: "2002", ended: true, instruments: ["drums (drum set)"] }],
      // Otras afiliaciones (solo de las personas sincronizadas: Vince Neil y John 5).
      [
        { membershipId: "m1", personId: "john5", otherId: "manson", otherName: "Marilyn Manson", otherLifeEnded: false, leftOn: null, periodId: "x", endDate: "2009", ended: true },
        { membershipId: "m2", personId: "john5", otherId: "zombie", otherName: "Rob Zombie", otherLifeEnded: false, leftOn: null, periodId: "y", endDate: null, ended: false },
        { membershipId: "m3", personId: "vince", otherId: "vnb", otherName: "Vince Neil Band", otherLifeEnded: false, leftOn: null, periodId: null, endDate: null, ended: null },
      ],
      [{ personId: "john5", otherId: "lynch", otherName: "David Lee Roth", otherLifeEnded: false, endDate: "2004", ended: true }],
    ];
  }

  it("clasifica, arma líneas de instrumentos y trae las otras afiliaciones sin consultar MusicBrainz", async () => {
    queueGroup();
    const lineup = await getArtistLineup("crue");
    if (lineup?.kind !== "group") throw new Error("se esperaba un grupo");

    expect(lineup.current.map((p) => p.name)).toEqual(["Vince Neil", "John 5"]);
    expect(lineup.past.map((p) => p.name)).toEqual(["Integrante viejo", "Randy Castillo"]);
    expect(lineup.supportPast.map((p) => p.name)).toEqual(["Samantha Maloney"]);

    const vince = lineup.current[0]!;
    expect(vince.isFounder).toBe(true);
    expect(vince.lines).toEqual([
      {
        instruments: ["lead vocals"],
        periods: [
          { beginDate: "1981-01-17", endDate: "1992", ended: true },
          { beginDate: "2018", endDate: null, ended: false },
        ],
      },
    ]);
    // Sin período guardado cuenta con el resumen de `membership`.
    expect(vince.affiliations).toEqual([{ artistId: "vnb", name: "Vince Neil Band", current: true, support: false }]);

    const john5 = lineup.current[1]!;
    expect(john5.affiliations).toEqual([
      { artistId: "zombie", name: "Rob Zombie", current: true, support: false },
      { artistId: "manson", name: "Marilyn Manson", current: false, support: false },
      { artistId: "lynch", name: "David Lee Roth", current: false, support: true },
    ]);
  });

  it("una pertenencia sin períodos se arma con el resumen, sin la marca en los instrumentos", async () => {
    queueGroup();
    const lineup = await getArtistLineup("crue");
    if (lineup?.kind !== "group") throw new Error("se esperaba un grupo");
    const legacy = lineup.past.find((p) => p.name === "Integrante viejo")!;
    expect(legacy).toMatchObject({ isFounder: true, pending: true, affiliations: [] });
    expect(legacy.lines).toEqual([{ instruments: ["bass"], periods: [{ beginDate: null, endDate: "1990-05-01", ended: true }] }]);
  });

  it("informa las personas pendientes, que van sin afiliaciones", async () => {
    queueGroup();
    const lineup = await getArtistLineup("crue");
    if (lineup?.kind !== "group") throw new Error("se esperaba un grupo");
    expect(lineup.pending).toBe(3);
    const randy = lineup.past.find((p) => p.name === "Randy Castillo")!;
    expect(randy).toMatchObject({ pending: true, affiliations: [], deathYear: 2002 });
  });
});

describe("getArtistLineup de una persona", () => {
  it("trae sus grupos con discos principales, el apoyo que da y sus músicos de apoyo", async () => {
    mocks.readArtistDiscography.mockResolvedValue([
      { primaryType: "Album", secondaryTypes: [], category: "studio", creditRole: "primary" },
      { primaryType: "Album", secondaryTypes: ["Live"], category: "live_other", creditRole: "primary" },
    ]);
    const group = (id: string, name: string, extra: Partial<{ lifeEnded: boolean; discographySyncedAt: Date | null }> = {}) => ({
      id,
      name,
      photoUrl: `https://thumb/${id}.jpg`,
      photoBlockedAt: null,
      lifeBegin: "1981",
      lifeEnd: null,
      lifeEnded: extra.lifeEnded ?? false,
      discographySyncedAt: extra.discographySyncedAt === undefined ? SYNCED : extra.discographySyncedAt,
    });
    const drummer = person("tommy", "Baterista");
    queue.results = [
      [{ id: "ozzy", type: "person", lifeEnded: false, lifeEnd: null }],
      [
        { group: group("mom", "Methods of Mayhem", { discographySyncedAt: null }), role: null, joinedOn: null, leftOn: null, ...period("1999", "2010", ["drums (drum set)"]) },
        { group: group("crue", "Mötley Crüe"), role: null, joinedOn: null, leftOn: null, ...period("1981", null, ["drums (drum set)"], { ended: false, isFounder: true }) },
      ],
      [{ artistId: "lita", name: "Lita Ford", lifeEnded: false, beginDate: "1990", endDate: "1991", ended: true, instruments: ["drums (drum set)"] }],
      [{ person: drummer, beginDate: "2020", endDate: null, ended: false, instruments: ["drums (drum set)"] }],
      [],
      [],
    ];

    const lineup = await getArtistLineup("ozzy");
    if (lineup?.kind !== "person") throw new Error("se esperaba una persona");
    expect(lineup.groups.map((g) => [g.name, g.current, g.isFounder, g.mainCount])).toEqual([
      ["Mötley Crüe", true, true, 1],
      ["Methods of Mayhem", false, false, null],
    ]);
    expect(lineup.supportFor).toEqual([
      { artistId: "lita", name: "Lita Ford", current: false, lines: [{ instruments: ["drums (drum set)"], periods: [{ beginDate: "1990", endDate: "1991", ended: true }] }] },
    ]);
    expect(lineup.supportersCurrent.map((p) => p.name)).toEqual(["Baterista"]);
    expect(lineup.pending).toBe(0);
    // Solo la discografía del grupo sincronizado se lee; nunca se sincroniza.
    expect(mocks.readArtistDiscography).toHaveBeenCalledTimes(1);
  });

  it("un artista inexistente devuelve null", async () => {
    queue.results = [[]];
    expect(await getArtistLineup("nadie")).toBeNull();
  });
});
