import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistRow } from "@/db/schema";
import type { MBArtistRelation } from "../musicbrainz/types";
import { ensureArtistMemberships } from "./ingest-artist";

vi.mock("@/db", () => ({
  db: {
    transaction: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/services/musicbrainz/client", () => ({
  musicbrainz: { getArtistWithRelations: vi.fn() },
}));

const { db } = await import("@/db");
const { musicbrainz } = await import("@/services/musicbrainz/client");

function makeArtist(overrides: Partial<ArtistRow> = {}): ArtistRow {
  return {
    id: "person-local",
    mbid: "person-mb",
    type: "person",
    name: "Persona",
    bio: null,
    photoUrl: null,
    createdAt: new Date("2026-01-01"),
    discographySyncedAt: null,
    membershipsSyncedAt: null,
    ...overrides,
  };
}

function setup(current: ArtistRow) {
  const inserts: unknown[] = [];
  const updates: unknown[] = [];
  const deletes: unknown[] = [];
  const tx = {
    execute: vi.fn(async () => undefined),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(async () => [current]) })),
      })),
    })),
    insert: vi.fn((table: unknown) => {
      const chain = {
        values: vi.fn((values: unknown) => {
          inserts.push({ table, values });
          return chain;
        }),
        onConflictDoUpdate: vi.fn(() => chain),
        returning: vi.fn(async () => {
          const values = inserts.at(-1) as { values: { mbid: string } };
          return [{
            ...makeArtist(),
            id: values.values.mbid === "group-mb" ? "group-local" : "person-local",
            mbid: values.values.mbid,
            type: values.values.mbid === "group-mb" ? "group" : "person",
            name: values.values.mbid === "group-mb" ? "Grupo" : "Persona",
          }];
        }),
      };
      return chain;
    }),
    delete: vi.fn(() => ({ where: vi.fn(async (condition: unknown) => { deletes.push(condition); }) })),
    update: vi.fn(() => ({ set: vi.fn((values: unknown) => ({ where: vi.fn(async () => { updates.push(values); }) })) })),
  };
  vi.mocked(db.transaction).mockImplementation(async (callback) => callback(tx as never));
  return { tx, inserts, updates, deletes };
}

const detail = (relations: MBArtistRelation[] = [{
  type: "member of band",
  artist: { id: "group-mb", name: "Grupo", type: "Group" },
  attributes: ["guitar"],
  begin: "1970-01-01",
  end: "1980-01-01",
}]) => ({ id: "person-mb", name: "Persona", type: "Person", relations });

describe("ensureArtistMemberships", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ingiere en frío, reconcilia stale y marca el flag al final", async () => {
    const { inserts, updates, deletes, tx } = setup(makeArtist());
    vi.mocked(musicbrainz.getArtistWithRelations).mockResolvedValue(detail());

    await ensureArtistMemberships(makeArtist());

    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(musicbrainz.getArtistWithRelations).toHaveBeenCalledWith("person-mb");
    expect(inserts).toHaveLength(3); // artista persona, grupo y membership
    expect(deletes).toHaveLength(1); // borra solo relaciones stale de esta persona
    expect(updates).toEqual([{ membershipsSyncedAt: expect.any(Date) }]);
  });

  it("no llama a MusicBrainz en cache hit", async () => {
    const { inserts, deletes, updates } = setup(makeArtist({ membershipsSyncedAt: new Date() }));

    await ensureArtistMemberships(makeArtist());

    expect(musicbrainz.getArtistWithRelations).not.toHaveBeenCalled();
    expect(inserts).toHaveLength(0);
    expect(deletes).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("deja el flag sin marcar y no borra ni escribe ante error externo", async () => {
    const { inserts, deletes, updates } = setup(makeArtist());
    vi.mocked(musicbrainz.getArtistWithRelations).mockRejectedValue(new Error("MusicBrainz caído"));

    await expect(ensureArtistMemberships(makeArtist())).rejects.toThrow("MusicBrainz caído");
    expect(inserts).toHaveLength(0);
    expect(deletes).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("propaga un fallo de escritura sin observar un flag exitoso", async () => {
    const current = makeArtist();
    const { tx, inserts, updates } = setup(current);
    const writeError = new Error("fallo al escribir el artista relacionado");
    vi.mocked(musicbrainz.getArtistWithRelations).mockResolvedValue(detail());
    tx.insert.mockImplementationOnce(() => {
      throw writeError;
    });

    await expect(ensureArtistMemberships(current)).rejects.toBe(writeError);
    expect(inserts).toHaveLength(0);
    expect(updates).toHaveLength(0);
  });

  it("consolida roles y conserva la fecha conocida de cada extremo", async () => {
    const { inserts } = setup(makeArtist());
    vi.mocked(musicbrainz.getArtistWithRelations).mockResolvedValue(detail([
      { type: "member of band", artist: { id: "group-mb", name: "Grupo", type: "Group" }, attributes: ["guitar"], begin: "1975-01-01" },
      { type: "member of band", artist: { id: "group-mb", name: "Grupo", type: "Group" }, attributes: ["vocals"], end: "1980-01-01" },
    ]));

    await ensureArtistMemberships(makeArtist());

    const membershipInsert = inserts[2] as { values: Record<string, unknown> };
    expect(membershipInsert.values).toMatchObject({
      role: "guitar, vocals",
      joinedOn: "1975-01-01",
      leftOn: "1980-01-01",
    });
  });

  it("es idempotente cuando la segunda lectura observa el flag ya marcado", async () => {
    const first = makeArtist();
    const { inserts } = setup(first);
    vi.mocked(musicbrainz.getArtistWithRelations).mockResolvedValue(detail());
    await ensureArtistMemberships(first);

    setup(makeArtist({ membershipsSyncedAt: new Date() }));
    await ensureArtistMemberships(first);

    expect(musicbrainz.getArtistWithRelations).toHaveBeenCalledTimes(1);
    expect(inserts.length).toBeGreaterThan(0);
  });
});
