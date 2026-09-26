export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import {
  ALBUM_TITLE,
  IDS,
  SMOKE_PREFIX,
  bandWithMembers,
  editionsBrowse,
  mockMusicBrainz,
  originalRelease,
} from "./smoke-album-fixtures";

assertSmokeAllowed();

// Smoke test de créditos de personal contra Postgres real (openspec:
// enrich-album-editions-and-credits). Mockea `global.fetch` con fixtures sintéticos
// (MBID `*-0000-4000-8000-*`) y verifica: la sincronización de un álbum ingerido antes de
// los créditos (una request), las pertenencias de la banda, la clasificación en niveles,
// el reemplazo idempotente y el lock que evita una segunda sincronización. Borra todos sus
// fixtures al terminar.

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
  const { syncPersonnelCredits } = await import("../src/services/catalog/personnel-credits");
  const { getAlbumPersonnel, getRecordingSongwriters } = await import("../src/services/catalog/personnel-levels");

  const mb = mockMusicBrainz({
    browse: () => editionsBrowse(),
    [`release/${IDS.original}`]: originalRelease,
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

    console.log("1) Ingesta con créditos en la misma request");
    const representative = await findOrIngestTracklist(rg!.id, IDS.releaseGroup);
    check(mb.calls.filter((c) => c.startsWith("release/")).length === 1, "una sola request de edición");
    const [afterIngest] = await db.select().from(schema.release).where(eq(schema.release.id, representative!.id));
    check(afterIngest?.personnelSyncedAt !== null, "la edición queda con personnel_synced_at");
    check(afterIngest?.worksSyncedAt !== null, "la edición queda con works_synced_at (autoría en la misma request)");
    const worksAfterIngest = await db
      .select()
      .from(schema.work)
      .where(like(sql`${schema.work.mbid}::text`, `${SMOKE_PREFIX}%`));
    check(worksAfterIngest.length === 4, `se guardaron las 4 obras (${worksAfterIngest.length})`);

    console.log("2) Álbum ingerido antes de los créditos");
    const trackRows = await db.select().from(schema.track).where(eq(schema.track.releaseId, representative!.id));
    await db.delete(schema.personnelCredit).where(eq(schema.personnelCredit.releaseId, representative!.id));
    for (const t of trackRows) {
      await db.delete(schema.personnelCredit).where(eq(schema.personnelCredit.recordingId, t.recordingId));
    }
    await db.update(schema.release).set({ personnelSyncedAt: null, worksSyncedAt: null }).where(eq(schema.release.id, representative!.id));
    await db.delete(schema.work).where(like(sql`${schema.work.mbid}::text`, `${SMOKE_PREFIX}%`));
    await db.delete(schema.membership).where(eq(schema.membership.groupId, band.id));
    await db.update(schema.artist).set({ membershipsSyncedAt: null }).where(eq(schema.artist.id, band.id));

    const before = mb.calls.length;
    const result = await syncPersonnelCredits(rg!.id);
    check(result.status === "synced", `se sincronizó (${result.status})`);
    check(mb.calls.length === before + 2, "una request de edición y una de pertenencias de la banda");
    const credits = await db.select().from(schema.personnelCredit);
    const ours = credits.filter(
      (c) => c.releaseId === representative!.id || trackRows.some((t) => t.recordingId === c.recordingId),
    );
    check(ours.length === 10, `se guardaron los 10 créditos (${ours.length})`);
    const [memberRow] = await db
      .select()
      .from(schema.membership)
      .where(and(eq(schema.membership.groupId, band.id)));
    check(Boolean(memberRow), "se sincronizaron las pertenencias de la banda");
    const workCredits = await db
      .select({ relationType: schema.workCredit.relationType })
      .from(schema.workCredit)
      .innerJoin(schema.work, eq(schema.work.id, schema.workCredit.workId))
      .where(like(sql`${schema.work.mbid}::text`, `${SMOKE_PREFIX}%`));
    check(workCredits.length === 4, `se guardaron los 4 créditos de autoría en la misma sincronización (${workCredits.length})`);

    console.log("3) Clasificación en niveles");
    const personnel = await getAlbumPersonnel(rg!.id);
    const levels = personnel?.levels;
    check(personnel?.leadKind === "group", "el artista principal de una banda se informa como grupo");
    check(levels?.members.map((e) => e.name).join() === "Integrante de humo", "el integrante está en Integrantes");
    check(levels?.members[0]?.tracks === "all", "el integrante participa en todas las pistas");
    const guest = levels?.guests[0];
    check(
      guest?.name === "Invitada de humo" && Array.isArray(guest.tracks) && guest.tracks[0]?.position === 3,
      "la invitada está en Músicos invitados con la pista 3",
    );
    check(levels?.production.map((e) => e.name).join() === "Ingeniero de humo", "el ingeniero está en Producción y sonido");
    check(levels?.other.map((e) => e.name).join() === "Diseño de humo", "el diseño está en Arte y otros");
    const songwriters = personnel?.songwriters ?? [];
    check(
      songwriters[0]?.name === "Autora de humo" && Array.isArray(songwriters[0].tracks) && songwriters[0].tracks.length === 3,
      "la autora firma las pistas 1 a 3 (la 4 tiene obra sin autores)",
    );
    const track2 = trackRows.find((t) => t.position === 2)!;
    const byTrack2 = personnel?.byTrack.tracks[track2.recordingId]?.songwriting.map((p) => p.name).sort();
    check(byTrack2?.join() === "Autora de humo,Letrista de humo", "la pista 2 lista música y letra en Composición");
    const writers2 = await getRecordingSongwriters(track2.recordingId);
    check(
      writers2.map((p) => `${p.name}:${p.roles.map((r) => r.relationType).join("+")}`).sort().join() ===
        "Autora de humo:composer,Letrista de humo:lyricist",
      "la canción 2 tiene autora (música) y letrista",
    );

    console.log("3b) Autoría pendiente con el personal ya sincronizado");
    await db.update(schema.release).set({ worksSyncedAt: null }).where(eq(schema.release.id, representative!.id));
    const beforeWorks = mb.calls.length;
    const worksOnly = await syncPersonnelCredits(rg!.id);
    check(worksOnly.status === "synced" && mb.calls.length === beforeWorks + 1, "una sola request de edición completa la autoría");
    const creditsAgain = await db
      .select({ id: schema.workCredit.id })
      .from(schema.workCredit)
      .innerJoin(schema.work, eq(schema.work.id, schema.workCredit.workId))
      .where(like(sql`${schema.work.mbid}::text`, `${SMOKE_PREFIX}%`));
    check(creditsAgain.length === 4, `reemplazo idempotente: siguen 4 créditos de autoría (${creditsAgain.length})`);

    console.log("4) Segunda sincronización");
    const beforeSecond = mb.calls.length;
    const second = await syncPersonnelCredits(rg!.id);
    check(second.status === "skipped" && mb.calls.length === beforeSecond, "ya sincronizado: no vuelve a pedir");
  } finally {
    mb.restore();
    await cleanup();
    console.log("\nFixtures borrados.");
  }

  console.log(failures === 0 ? "\n✅ Smoke test de créditos OK" : `\n❌ ${failures} verificación(es) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
