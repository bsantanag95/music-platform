export {}; // fuerza module scope
import { assertSmokeAllowed } from "./assert-smoke-allowed";

assertSmokeAllowed();

// Valida los dos endpoints nuevos sin levantar un servidor Next.js real:
// llama directo a los mismos servicios/queries que usan las rutas.

async function main() {
  const { db } = await import("../src/db");
  const { releaseGroup, release, track, recording, credit, artist } = await import("../src/db/schema");
  const { eq, inArray } = await import("drizzle-orm");
  const { getArtistById } = await import("../src/services/catalog/ingest-artist");

  console.log("1) getArtistById sobre Pink Floyd (ya completo, no debería tocar la red)...");
  const [pinkFloyd] = await db.select().from(artist).where(eq(artist.name, "Pink Floyd")).limit(1);
  const byId = await getArtistById(pinkFloyd!.id);
  console.log(`   -> type=${byId?.type}, mismo id=${byId?.id === pinkFloyd!.id}`);

  console.log("\n2) Reproduciendo la query de release-group/[id] con créditos...");
  const [rel] = await db.select().from(release).limit(1);
  const tracks = await db
    .select({
      recordingId: track.recordingId,
      position: track.position,
      discNumber: track.discNumber,
      title: recording.title,
      durationSec: recording.durationSec,
    })
    .from(track)
    .innerJoin(recording, eq(track.recordingId, recording.id))
    .where(eq(track.releaseId, rel!.id));

  const recordingIds = tracks.map((t) => t.recordingId);
  const creditRows = await db
    .select({
      recordingId: credit.recordingId,
      artistId: artist.id,
      name: artist.name,
      role: credit.role,
      joinPhrase: credit.joinPhrase,
      position: credit.position,
    })
    .from(credit)
    .innerJoin(artist, eq(artist.id, credit.artistId))
    .where(inArray(credit.recordingId, recordingIds));

  const byRecording = new Map<string, typeof creditRows>();
  for (const c of creditRows) {
    if (!c.recordingId) continue;
    const list = byRecording.get(c.recordingId) ?? [];
    list.push(c);
    byRecording.set(c.recordingId, list);
  }

  const result = tracks.map((t) => ({
    title: t.title,
    credits: (byRecording.get(t.recordingId) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((c) => `${c.name}${c.joinPhrase ?? ""}`)
      .join(""),
  }));

  console.log(JSON.stringify(result, null, 2));

  const breathe = result.find((r) => r.title.includes("Breathe"));
  if (breathe?.credits === "Pink Floyd feat. Roger Waters") {
    console.log("\n✅ Créditos por canción funcionando en el join del endpoint.");
  } else {
    console.log("\n❌ Los créditos no salieron como se esperaba.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
