import { describe, expect, it, vi } from "vitest";

// El módulo importa `@/db`, que exige `DATABASE_URL`; estas pruebas solo ejercitan las funciones
// puras, así que se reemplaza el cliente antes de importarlo.
vi.mock("@/db", () => ({ db: {} }));

import { notificationLinkQueue, releaseNotificationCandidates } from "./release-calendar-sync";

type Entry = {
  releaseGroupId: string | null;
  exclusion: "secondary_type" | "reissue" | null;
  firstReleaseDate: string | null;
  releaseDate: string;
  primaryType: "Album" | "EP" | "Single";
};

function entry(overrides: Partial<Entry> & { releaseGroupId?: string | null } = {}): Entry {
  return {
    releaseGroupId: "rg-1",
    exclusion: null,
    firstReleaseDate: null,
    releaseDate: "2026-10-20",
    primaryType: "Album",
    ...overrides,
  };
}

describe("notificationLinkQueue", () => {
  it("pone los discos de artistas seguidos antes que los sencillos y el resto", () => {
    const queue = notificationLinkQueue(
      [{ id: "seguido" }],
      [{ id: "sencillo" }],
      [{ id: "relacion" }],
    );
    expect(queue.map((item) => item.id)).toEqual(["seguido", "sencillo", "relacion"]);
  });

  it("respeta el tope y deja fuera lo que no cabe, sin reordenar", () => {
    const queue = notificationLinkQueue(
      [{ id: "a" }, { id: "b" }],
      [{ id: "c" }],
      [{ id: "d" }],
      3,
    );
    expect(queue.map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("no muta las listas de entrada", () => {
    const followed = [{ id: "a" }];
    const others = [{ id: "b" }];
    notificationLinkQueue(followed, [], others);
    expect(followed).toEqual([{ id: "a" }]);
    expect(others).toEqual([{ id: "b" }]);
  });
});

describe("releaseNotificationCandidates", () => {
  it("descarta lo no vinculado y lo excluido", () => {
    const candidates = releaseNotificationCandidates(
      [
        entry({ releaseGroupId: "ok" }),
        entry({ releaseGroupId: null }),
        entry({ releaseGroupId: "excluido", exclusion: "reissue" }),
      ],
      [],
    );
    expect(candidates).toEqual([
      { releaseGroupId: "ok", releaseDate: "2026-10-20", category: "album" },
    ]);
  });

  it("prefiere la fecha verificada y clasifica EP y sencillo", () => {
    const candidates = releaseNotificationCandidates(
      [
        entry({ releaseGroupId: "ep", primaryType: "EP", firstReleaseDate: "2026-10-18" }),
        entry({ releaseGroupId: "album", primaryType: "Album" }),
      ],
      [entry({ releaseGroupId: "single", primaryType: "Single", releaseDate: "2026-10-22" })],
    );

    expect(candidates).toEqual([
      { releaseGroupId: "ep", releaseDate: "2026-10-18", category: "ep" },
      { releaseGroupId: "album", releaseDate: "2026-10-20", category: "album" },
      { releaseGroupId: "single", releaseDate: "2026-10-22", category: "single" },
    ]);
  });
});
