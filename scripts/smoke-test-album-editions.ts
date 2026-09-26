export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import {
  ALBUM_TITLE,
  IDS,
  SMOKE_PREFIX,
  bandWithMembers,
  editionsBrowse,
  experienceRelease,
  mockMusicBrainz,
  originalRelease,
} from "./smoke-album-fixtures";

assertSmokeAllowed();

// Smoke test de ediciones de álbum contra Postgres real (openspec:
// enrich-album-editions-and-credits). Mockea `global.fetch` con fixtures sintéticos
// (MBID `*-0000-4000-8000-*`) y verifica: ingesta paginada con sellos, marca de
// representativa, variantes, pistas adicionales bajo demanda (1 request la primera vez,
// 0 después), el índice único de representativa y la re-canonicalización por intercambio
// de marca. Borra todos sus fixtures al terminar.

let failures = 0;
function check(condition: boolean, message: string) {
  console.log(`${condition ? "✅" : "❌"} ${message}`);
  if (!condition) failures++;
}

async function main() {
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { and, eq, like, sql } = await import("drizzle-orm");
  const { upsertArtistFromMb } = await import("../src/services/catalog/ingest-artist");
  const { findOrIngestTracklist } = await import("../src/services/catalog/ingest-release");
  const { getAlbumEditions, getEditionExtraTracks } = await import("../src/services/catalog/album-editions");
  const { recanonicalizeReleaseGroup } = await import("../src/services/catalog/recanonicalize");

  let onlyExperienceOfficial = false;
  const mb = mockMusicBrainz({
    browse: () => editionsBrowse(onlyExperienceOfficial),
    [`release/${IDS.original}`]: originalRelease,
    [`release/${IDS.experienceGb}`]: experienceRelease,
    [`artist/${IDS.band}`]: bandWithMembers,
  });

  async function cleanup() {
    await db.delete(schema.releaseGroup).where(eq(schema.releaseGroup.mbid, IDS.releaseGroup));
    await db.delete(schema.work).where(like(sql`${schema.work.mbid}::text`, `${SMOKE_PREFIX}%`));
    await db.delete(schema.recording).where(like(sql`${schema.recording.mbid}::text`, `${SMOKE_PREFIX}%`));
    await db.delete(schema.label).where(eq(schema.label.mbid, IDS.label));
    await db.delete(schema.artist).where(like(sql`${schema.artist.mbid}::text`, `${SMOKE_PREFIX}%`));
  }

  try {
    await cleanup();
    const [rg] = await db
      .insert(schema.releaseGroup)
      .values({ mbid: IDS.releaseGroup, title: ALBUM_TITLE, category: "studio" })
      .returning();
    const band = await upsertArtistFromMb(IDS.band, "Banda de humo", "Group");
    await db.insert(schema.credit).values({ artistId: band.id, releaseGroupId: rg!.id, position: 0, role: "primary" });

    console.log("1) Primera ingesta del álbum");
    const representative = await findOrIngestTracklist(rg!.id, IDS.releaseGroup);
    check(representative?.mbid === IDS.original, "la representativa es la original");
    check(representative?.isRepresentative === true, "la release queda marcada como representativa");
    check(mb.calls.filter((c) => c === "browse").length === 1, "una sola página de browse (6 ediciones)");

    const editions = await db.select().from(schema.releaseEdition).where(eq(schema.releaseEdition.releaseGroupId, rg!.id));
    check(editions.length === 6, `se guardaron las 6 ediciones (${editions.length})`);
    const [synced] = await db.select().from(schema.releaseGroup).where(eq(schema.releaseGroup.id, rg!.id));
    check(synced?.editionsSyncedAt !== null, "el álbum queda con editions_synced_at");
    const links = await db
      .select()
      .from(schema.releaseEditionLabel)
      .innerJoin(schema.releaseEdition, eq(schema.releaseEdition.id, schema.releaseEditionLabel.releaseEditionId))
      .where(eq(schema.releaseEdition.releaseGroupId, rg!.id));
    check(links.length === 6 && links.every((l) => l.release_edition_label.catalogNumber === "SMK 001"), "sello y catálogo por edición");

    console.log("2) Reingesta idempotente del resumen");
    const { saveReleaseEditions } = await import("../src/services/catalog/release-editions");
    await saveReleaseEditions(rg!.id, editionsBrowse().releases);
    const again = await db.select().from(schema.releaseEdition).where(eq(schema.releaseEdition.releaseGroupId, rg!.id));
    const labels = await db.select().from(schema.label).where(eq(schema.label.mbid, IDS.label));
    check(again.length === 6 && labels.length === 1, "no duplica ediciones ni sellos");

    console.log("3) Variantes");
    const overview = await getAlbumEditions(rg!.id);
    const regular = overview.variants.filter((v) => !v.isBox);
    check(overview.representativeTrackCount === 4, "la lista principal tiene 4 pistas");
    check(regular.length === 1 && regular[0]!.name === "Experience Edition", "una variante: Experience Edition");
    check(regular[0]?.editionCount === 2 && regular[0]?.countries.join(",") === "GB,US", "agrupa GB y US");
    check(overview.variants.filter((v) => v.isBox).length === 1, "la caja se marca como caja; el SACD de capas no es variante");

    console.log("4) Pistas adicionales bajo demanda");
    const experience = regular[0]!;
    const before = mb.calls.length;
    const extra = await getEditionExtraTracks(rg!.id, experience.editionId);
    check(mb.calls.length === before + 1, "la primera apertura hace una request");
    check(
      extra.map((t) => t.title).join(" | ") === "Dinero (Live) | Tiempo (Demo)",
      `solo lo que agrega, sin el remaster (${extra.map((t) => t.title).join(" | ")})`,
    );
    const second = await getEditionExtraTracks(rg!.id, experience.editionId);
    check(mb.calls.length === before + 1 && second.length === 2, "la segunda apertura no llama a MusicBrainz");
    const releases = await db.select().from(schema.release).where(eq(schema.release.releaseGroupId, rg!.id));
    check(
      releases.length === 2 && releases.filter((r) => r.isRepresentative).length === 1,
      "la variante quedó como release no representativa",
    );
    const box = overview.variants.find((v) => v.isBox)!;
    const boxError = await getEditionExtraTracks(rg!.id, box.editionId).catch((e: { code?: string }) => e.code);
    check(boxError === "EDITION_IS_BOX", "una caja responde EDITION_IS_BOX");

    console.log("5) Índice único de representativa");
    const variantRelease = releases.find((r) => !r.isRepresentative)!;
    const uniqueError = await db
      .update(schema.release)
      .set({ isRepresentative: true })
      .where(eq(schema.release.id, variantRelease.id))
      .then(() => null)
      .catch((e: { cause?: { code?: string }; code?: string }) => e.cause?.code ?? e.code ?? "error");
    check(uniqueError === "23505", `la base rechaza una segunda representativa (${uniqueError})`);

    console.log("6) Re-canonicalización por intercambio de marca");
    onlyExperienceOfficial = true; // la elegida pasa a ser la Experience, ya ingerida como variante
    const beforeRecanon = mb.calls.filter((c) => c.startsWith("release/")).length;
    const result = await recanonicalizeReleaseGroup(rg!.id);
    check(result.status === "recanonicalized", `se recanonicalizó (${result.status})`);
    const [newRep] = await db
      .select()
      .from(schema.release)
      .where(and(eq(schema.release.releaseGroupId, rg!.id), eq(schema.release.isRepresentative, true)));
    check(newRep?.mbid === IDS.experienceGb, "la Experience pasa a ser la representativa");
    check(
      mb.calls.filter((c) => c.startsWith("release/")).length === beforeRecanon,
      "el intercambio no volvió a pedir la tracklist",
    );
    const all = await db.select().from(schema.release).where(eq(schema.release.releaseGroupId, rg!.id));
    check(all.length === 2, "la representativa anterior se conserva como edición no representativa");
  } finally {
    mb.restore();
    await cleanup();
    console.log("\nFixtures borrados.");
  }

  console.log(failures === 0 ? "\n✅ Smoke test de ediciones OK" : `\n❌ ${failures} verificación(es) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
