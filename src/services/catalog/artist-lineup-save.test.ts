import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect, getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import motleyCrue from "../musicbrainz/__fixtures__/motley-crue-artist-with-relations.json";
import randyCastillo from "../musicbrainz/__fixtures__/randy-castillo-artist-with-relations.json";
import type { MBArtistDetail } from "../musicbrainz/types";

const mocks = vi.hoisted(() => ({ upsertArtistFromMb: vi.fn() }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("./artist-upsert", () => ({ upsertArtistFromMb: mocks.upsertArtistFromMb }));

const { saveArtistLineup, membershipSummary } = await import("./artist-lineup-save");

const dialect = new PgDialect();
const MOTLEY_CRUE = motleyCrue as MBArtistDetail;
const RANDY_CASTILLO = randyCastillo as MBArtistDetail;

interface Recorded {
  inserts: { table: string; values: unknown }[];
  deletes: { table: string; where: string; params: unknown[] }[];
  updates: { table: string; values: unknown }[];
}

function recordingTx() {
  const log: Recorded = { inserts: [], deletes: [], updates: [] };
  let membershipIds = 0;
  const name = (table: PgTable) => getTableConfig(table).name;
  const tx = {
    insert: (table: PgTable) => ({
      values: (values: unknown) => {
        log.inserts.push({ table: name(table), values });
        const chain = {
          onConflictDoUpdate: () => chain,
          returning: async () => [{ id: `membership-${++membershipIds}` }],
          then: (resolve: (value: unknown) => void) => resolve(undefined),
        };
        return chain;
      },
    }),
    delete: (table: PgTable) => ({
      where: async (condition: SQL) => {
        const query = dialect.sqlToQuery(condition);
        log.deletes.push({ table: name(table), where: query.sql, params: query.params });
      },
    }),
    update: (table: PgTable) => ({
      set: (values: unknown) => ({
        where: async () => {
          log.updates.push({ table: name(table), values });
        },
      }),
    }),
  };
  return { tx, log };
}

beforeEach(() => {
  vi.clearAllMocks();
  // El id local es el MBID con prefijo: basta para seguir quién es quién.
  mocks.upsertArtistFromMb.mockImplementation(async (mbid: string) => ({ id: `local-${mbid}` }));
});

describe("membershipSummary", () => {
  it("une los instrumentos de todos los períodos, sin marcas, y resume las fechas", () => {
    const period = (instruments: string[], joinedOn: string | null, leftOn: string | null) =>
      ({ instruments, joinedOn, leftOn }) as Parameters<typeof membershipSummary>[0][number];
    expect(membershipSummary([period(["drums (drum set)"], "1981-01-17", null), period(["keyboard", "drums (drum set)"], null, null)])).toEqual({
      role: "drums (drum set), keyboard",
      joinedOn: "1981-01-17",
      leftOn: null,
    });
  });
});

describe("saveArtistLineup", () => {
  it("guarda un par por persona con todos sus períodos (grupo)", async () => {
    const { tx, log } = recordingTx();
    await saveArtistLineup(tx as never, { id: `local-${MOTLEY_CRUE.id}` }, MOTLEY_CRUE);

    const memberships = log.inserts.filter((i) => i.table === "membership");
    // 14 relaciones de pertenencia, 8 personas distintas.
    expect(memberships).toHaveLength(8);
    const periods = log.inserts.filter((i) => i.table === "membership_period").map((i) => i.values as unknown[]);
    expect(periods.map((p) => p.length).reduce((a, b) => a + b, 0)).toBe(14);

    const vinceIndex = memberships.findIndex((i) => (i.values as { personId: string }).personId === "local-ce39ec95-5476-4c65-a862-fec96ff851ec");
    const vince = memberships[vinceIndex]!.values as Record<string, unknown>;
    // El resumen no incluye `original`; los períodos, las marcas aparte.
    expect(vince.role).not.toContain("original");
    expect(periods[vinceIndex]).toHaveLength(3);
    expect(periods[vinceIndex]).toContainEqual(expect.objectContaining({ beginDate: "2018", endDate: null, ended: false, isFounder: true }));
  });

  it("reemplaza solo su lado: pares del grupo, períodos del par y el apoyo que recibe", async () => {
    const { tx, log } = recordingTx();
    const groupId = `local-${MOTLEY_CRUE.id}`;
    await saveArtistLineup(tx as never, { id: groupId }, MOTLEY_CRUE);

    const periodDeletes = log.deletes.filter((d) => d.table === "membership_period");
    expect(periodDeletes).toHaveLength(8);
    expect(periodDeletes[0]!.where).toBe('"membership_period"."membership_id" = $1');

    const [stale] = log.deletes.filter((d) => d.table === "membership");
    expect(stale!.where).toMatch(/^\("membership"\."group_id" = \$1 and "membership"\."person_id" not in/);
    expect(stale!.params[0]).toBe(groupId);

    const [support] = log.deletes.filter((d) => d.table === "artist_support");
    expect(support!.where).toBe('("artist_support"."musician_id" = $1 or "artist_support"."artist_id" = $2)');
    const supports = log.inserts.find((i) => i.table === "artist_support")!.values as { artistId: string; kind: string }[];
    expect(supports).toHaveLength(6);
    expect(supports.every((s) => s.artistId === groupId && s.kind === "instrumental")).toBe(true);

    expect(log.updates).toEqual([{ table: "artist", values: { lineupSyncedAt: expect.any(Date), membershipsSyncedAt: expect.any(Date) } }]);
  });

  it("una persona reemplaza sus pares y guarda el apoyo que da, también a un solista", async () => {
    const { tx, log } = recordingTx();
    const randyId = `local-${RANDY_CASTILLO.id}`;
    await saveArtistLineup(tx as never, { id: randyId }, RANDY_CASTILLO);

    const [stale] = log.deletes.filter((d) => d.table === "membership");
    expect(stale!.where).toMatch(/^\("membership"\."person_id" = \$1 and "membership"\."group_id" not in/);
    expect(log.inserts.filter((i) => i.table === "membership")).toHaveLength(3);

    const supports = log.inserts.find((i) => i.table === "artist_support")!.values as Record<string, unknown>[];
    expect(supports).toHaveLength(3);
    expect(supports.every((s) => s.musicianId === randyId)).toBe(true);
    // Ozzy Osbourne es una persona: el apoyo igual se guarda.
    expect(mocks.upsertArtistFromMb).toHaveBeenCalledWith(expect.any(String), "Ozzy Osbourne", "Person", null, tx);
  });

  it("hace upsert de cada artista una sola vez, incluido el propio (para su tipo)", async () => {
    const { tx } = recordingTx();
    await saveArtistLineup(tx as never, { id: `local-${MOTLEY_CRUE.id}` }, MOTLEY_CRUE);
    const mbids = mocks.upsertArtistFromMb.mock.calls.map((call) => call[0]);
    expect(new Set(mbids).size).toBe(mbids.length);
    expect(mbids).toContain(MOTLEY_CRUE.id);
  });

  it("sin relaciones borra todo su lado y no inserta", async () => {
    const { tx, log } = recordingTx();
    await saveArtistLineup(tx as never, { id: "local-x" }, { id: "x", name: "Solista", type: "Person", relations: [] });
    expect(log.inserts).toHaveLength(0);
    expect(log.deletes.map((d) => d.where)).toEqual([
      '"membership"."person_id" = $1',
      '("artist_support"."musician_id" = $1 or "artist_support"."artist_id" = $2)',
    ]);
  });
});
