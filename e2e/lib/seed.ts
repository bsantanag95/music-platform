// Siembra y limpieza de los datos de los E2E, directo con los servicios de la app (sin red: el catálogo es
// sintético y queda marcado como ya sincronizado para que ninguna página intente pedirle nada a MusicBrainz).

import { ALBUM_TITLE, ARTIST_NAME, IDS, LIST_TITLE, TRACK_TITLES, USER } from "./fixtures";

export async function cleanupE2eData(): Promise<void> {
  const { db } = await import("../../src/db");
  const schema = await import("../../src/db/schema");
  const { inArray, like, sql } = await import("drizzle-orm");

  // Los usuarios primero: su borrado en cascada limpia valoraciones, listas, escuchas y marcas.
  await db.delete(schema.appUser).where(inArray(schema.appUser.username, [USER.username, USER.otherUsername]));
  await db.delete(schema.releaseGroup).where(like(sql`${schema.releaseGroup.mbid}::text`, "e2e00000-%"));
  await db.delete(schema.recording).where(like(sql`${schema.recording.mbid}::text`, "e2e00000-%"));
  await db.delete(schema.artist).where(like(sql`${schema.artist.mbid}::text`, "e2e00000-%"));
}

export interface SeededData {
  userId: string;
  releaseGroupId: string;
  artistId: string;
}

export async function seedE2eData(): Promise<SeededData> {
  const { db } = await import("../../src/db");
  const schema = await import("../../src/db/schema");
  const { eq } = await import("drizzle-orm");
  const { registerUser } = await import("../../src/services/auth/users");
  const { createList } = await import("../../src/services/lists/lists");

  await cleanupE2eData();

  const now = new Date();
  const [artist] = await db
    .insert(schema.artist)
    .values({
      mbid: IDS.artist,
      type: "group",
      name: ARTIST_NAME,
      discographySyncedAt: now,
      discographyCompleteAt: now,
      discographyCheckedAt: now,
      membershipsSyncedAt: now,
      lineupSyncedAt: now,
      profileSyncedAt: now,
      wikimediaSyncedAt: now,
      concertsSyncedAt: now,
    })
    .returning();
  if (!artist) throw new Error("No se pudo crear el artista de prueba");

  const [releaseGroup] = await db
    .insert(schema.releaseGroup)
    .values({
      mbid: IDS.releaseGroup,
      title: ALBUM_TITLE,
      category: "studio",
      primaryType: "Album",
      secondaryTypes: [],
      firstReleaseDate: "2020-05-17",
      firstReleaseYear: 2020,
      editionsSyncedAt: now,
      genresSyncedAt: now,
      coverCheckedAt: now,
    })
    .returning();
  if (!releaseGroup) throw new Error("No se pudo crear el álbum de prueba");
  await db.insert(schema.credit).values({ artistId: artist.id, releaseGroupId: releaseGroup.id, position: 0, role: "primary" });

  const [release] = await db
    .insert(schema.release)
    .values({
      mbid: IDS.release,
      releaseGroupId: releaseGroup.id,
      releaseDate: "2020-05-17",
      isRepresentative: true,
      creditsSyncedAt: now,
      personnelSyncedAt: now,
      worksSyncedAt: now,
    })
    .returning();
  if (!release) throw new Error("No se pudo crear la edición de prueba");

  for (const [i, title] of TRACK_TITLES.entries()) {
    const [recording] = await db
      .insert(schema.recording)
      .values({ mbid: IDS.recording(i + 1), title, durationSec: 180 + i * 7 })
      .returning();
    if (!recording) throw new Error(`No se pudo crear la grabación ${title}`);
    await db.insert(schema.track).values({ releaseId: release.id, recordingId: recording.id, discNumber: 1, position: i + 1 });
    await db.insert(schema.credit).values({ artistId: artist.id, recordingId: recording.id, position: 0, role: "primary" });
  }

  // Usuarios: el de las pruebas y una persona pública para el flujo de perfil de terceros.
  const user = await registerUser({ username: USER.username, email: USER.email, password: USER.password });
  const other = await registerUser({ username: USER.otherUsername, email: USER.otherEmail, password: USER.password });
  if (!user || !other) throw new Error("No se pudieron crear los usuarios de prueba");
  // Sin onboarding pendiente: de lo contrario el login redirige a /welcome y ensucia los flujos.
  for (const id of [user.id, other.id]) {
    await db.update(schema.appUser).set({ onboardedAt: now }).where(eq(schema.appUser.id, id));
  }

  await createList({ theme: "recommendations", ownerId: user.id, entityType: "release-group", title: LIST_TITLE });

  return { userId: user.id, releaseGroupId: releaseGroup.id, artistId: artist.id };
}
