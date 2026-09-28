import { describe, expect, it } from "vitest";
import type { VersionEntry } from "@/services/catalog/recording-versions";
import { groupByDisc, variantLabel } from "./song-versions";

describe("variantLabel", () => {
  const song = "Stairway to Heaven";

  it("sin nada nuevo no hay variante", () => {
    expect(variantLabel("Stairway to Heaven", song)).toBeNull();
    expect(variantLabel("  stairway to heaven ", song)).toBeNull();
  });

  it("toma lo que el título agrega entre paréntesis, corchetes o tras un guion", () => {
    expect(variantLabel("Stairway to Heaven (version 1)", song)).toBe("version 1");
    expect(variantLabel("Stairway to Heaven (Earl’s Court, May 25, 1975)", song)).toBe("Earl’s Court, May 25, 1975");
    expect(variantLabel("Stairway to Heaven [take 2]", song)).toBe("take 2");
    expect(variantLabel("Stairway to Heaven - live", song)).toBe("live");
  });

  it("un título distinto o con varios agregados se muestra completo", () => {
    expect(variantLabel("Лестница на небеса (Stairway to Heaven)", song)).toBe("Лестница на небеса (Stairway to Heaven)");
    expect(variantLabel("Stairway to Heaven (live) (remaster)", song)).toBe("Stairway to Heaven (live) (remaster)");
    expect(variantLabel("Stairway to Heavens", song)).toBe("Stairway to Heavens");
  });
});

function entry(recordingId: string, disc: string | null, artistId = "lz"): VersionEntry {
  return {
    recordingId,
    title: "Stairway to Heaven",
    durationSec: null,
    artist: { id: artistId, name: artistId },
    attributes: [],
    disc: disc ? { releaseGroupId: disc, title: disc, year: 1993 } : null,
    earliestKey: "1993",
  };
}

describe("groupByDisc", () => {
  it("junta las grabaciones del mismo disco en el orden de su primera aparición", () => {
    const rows = groupByDisc(
      [entry("a", "sessions"), entry("b", "acoustic"), entry("c", "sessions"), entry("d", null), entry("e", null)],
      new Set(["lz"]),
    );
    expect(rows.map((row) => [row.disc?.releaseGroupId ?? null, row.recordings.map((r) => r.recordingId)])).toEqual([
      ["sessions", ["a", "c"]],
      ["acoustic", ["b"]],
      [null, ["d"]],
      [null, ["e"]],
    ]);
    expect(rows[0]!.artist).toBeNull();
  });

  it("separa por artista cuando no es el de la canción", () => {
    const rows = groupByDisc([entry("a", "tribute", "x"), entry("b", "tribute", "y")], new Set(["lz"]));
    expect(rows.map((row) => row.artist?.id)).toEqual(["x", "y"]);
  });
});
