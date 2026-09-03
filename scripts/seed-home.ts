export {};

// Seed de Inicio: llena "actividad de la comunidad" y "listas públicas
// recientes" (docs/05-features/home.md) con datos representativos.
//
// El catálogo (artistas/álbumes/canciones) NO se inventa: se ingiere de
// MusicBrainz por la misma ruta que usa la app en producción
// (findOrIngestArtist / findOrIngestDiscography / getAlbumDetail), respetando
// el rate limit del cliente. Solo los usuarios y su actividad social son de
// prueba — no hay ninguna restricción de producto sobre eso (a diferencia del
// catálogo, ver vision.md).
//
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/seed-home.ts
//
// Para limpiar todo lo generado por este script (cualquier corrida):
//   DELETE FROM app_user WHERE username LIKE 'seed_home_%';
// (el borrado de usuario hace cascade sobre sus ratings/comentarios/listas,
// ver ON DELETE CASCADE en src/db/schema.ts)

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { assertSeedAllowed } from "./assert-seed-allowed";
import { db } from "../src/db";
import { appUser, comment } from "../src/db/schema";
import { registerUser } from "../src/services/auth/users";
import { updateProfileVisibility } from "../src/services/social/profiles";
import { findOrIngestArtist } from "../src/services/catalog/ingest-artist";
import { findOrIngestDiscography } from "../src/services/catalog/ingest-discography";
import { getAlbumDetail } from "../src/services/catalog/album-detail";
import { resolveSocialTarget, upsertRating, createComment } from "../src/services/social";
import { createList, addItemToList } from "../src/services/lists/lists";
import type { SocialTargetType } from "../src/lib/api/schemas";

assertSeedAllowed();

const ARTIST_NAMES = ["Radiohead", "Fiona Apple", "Kendrick Lamar", "Tame Impala", "Fleetwood Mac"];
const USER_NAMES = ["alex", "bea", "cami", "dario", "eli", "fran", "gia"];
const PASSWORD = "SeedHome1234!";
const DAYS_BACK = 14;

const COMMENT_SNIPPETS = [
  "Lo escuché de punta a punta, no tiene relleno.",
  "Un poco irregular pero los mejores momentos son altísimos.",
  "Cada vez que lo vuelvo a poner encuentro algo nuevo.",
  "No me terminó de convencer, esperaba más de esto.",
  "De lo mejor que escuché este año.",
  "Se nota la evolución respecto a lo anterior.",
];

const LIST_TITLES: Record<SocialTargetType, string[]> = {
  artist: ["Artistas que sigo de cerca", "Para descubrir de a poco"],
  "release-group": ["Discos favoritos del momento", "Para escuchar completos"],
  recording: ["Canciones en repeat", "Playlist de fondo"],
};

interface Target {
  type: SocialTargetType;
  id: string;
  label: string;
}

function randomDate(daysBack: number): Date {
  return new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
}

function pick<T>(items: T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  while (chosen.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]!);
  }
  return chosen;
}

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function randomStars(): number {
  return randomOf([2, 2.5, 3, 3.5, 4, 4.5, 5]);
}

function detailedScoreFor(stars: number): number | undefined {
  if (Math.random() < 0.4) return undefined;
  const step = Math.round(stars * 2);
  return Math.floor(((step - 1) * 10 + 1 + step * 10) / 2);
}

function capitalize(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// El cliente de MusicBrainz (src/services/musicbrainz/client.ts) no reintenta
// ante un 503 transitorio — comportamiento de producción, fuera de alcance
// tocarlo acá. Este script sí necesita tolerarlo: hace varias llamadas
// seguidas por artista (búsqueda + discografía + tracklist por álbum) y un
// solo 503 no debería tirar abajo toda la corrida.
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isTransient = error instanceof Error && /MusicBrainz respondió 5\d\d/.test(error.message);
      if (!isTransient || attempt === attempts) throw error;
      const delayMs = 3000 * attempt;
      console.warn(`  ⚠ ${label} falló (${(error as Error).message}), reintento ${attempt}/${attempts - 1} en ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("unreachable");
}

async function ingestCatalog(): Promise<Target[]> {
  const targets: Target[] = [];
  for (const name of ARTIST_NAMES) {
    console.log(`  ingiriendo ${name}...`);
    const artistRow = await withRetry(`búsqueda de ${name}`, () => findOrIngestArtist(name));
    if (!artistRow) {
      console.warn(`  ⚠ "${name}" no se encontró en MusicBrainz, se omite`);
      continue;
    }
    targets.push({ type: "artist", id: artistRow.id, label: artistRow.name });

    const discography = await withRetry(`discografía de ${name}`, () => findOrIngestDiscography(artistRow));
    const studioAlbums = discography.filter((rg) => rg.category === "studio").slice(0, 2);
    for (const album of studioAlbums) {
      targets.push({ type: "release-group", id: album.id, label: `${album.title} — ${artistRow.name}` });
      const detail = await withRetry(`tracklist de ${album.title}`, () => getAlbumDetail(album.id));
      if (detail.kind === "ok") {
        for (const track of detail.detail.tracks.slice(0, 3)) {
          targets.push({ type: "recording", id: track.recordingId, label: `${track.title} — ${artistRow.name}` });
        }
      }
    }
  }
  return targets;
}

async function getOrCreateUser(username: string, email: string): Promise<string> {
  try {
    const user = await registerUser({ username, email, password: PASSWORD });
    if (!user) throw new Error(`registerUser no devolvió usuario para ${username}`);
    return user.id;
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      const [existing] = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.username, username)).limit(1);
      if (existing) return existing.id;
    }
    throw error;
  }
}

async function main() {
  console.log("🎵 seed-home: ingiriendo catálogo real...");
  const targets = await ingestCatalog();
  if (targets.length === 0) throw new Error("no se pudo ingerir ningún artista, abortando");

  const byType = {
    artist: targets.filter((t) => t.type === "artist"),
    "release-group": targets.filter((t) => t.type === "release-group"),
    recording: targets.filter((t) => t.type === "recording"),
  };
  const ratableTargets = [...byType["release-group"], ...byType.recording];
  // Los comentarios sí van a los tres tipos (artista / álbum / canción) — el
  // apartado "Comentarios populares" de Inicio los agrupa por tipo.
  const commentableTargets = [...byType.artist, ...ratableTargets];
  console.log(`  ${targets.length} objetivos disponibles (${byType.artist.length} artistas, ${byType["release-group"].length} álbumes, ${byType.recording.length} canciones)`);

  const suffix = randomUUID().slice(0, 6);
  console.log("👥 creando usuarios de prueba...");
  const userIds: string[] = [];
  for (const name of USER_NAMES) {
    const username = `seed_home_${name}_${suffix}`;
    const email = `${username}@example.test`;
    const userId = await getOrCreateUser(username, email);
    await db.update(appUser).set({ displayName: capitalize(name) }).where(eq(appUser.id, userId));
    userIds.push(userId);
    console.log(`  + ${username}`);
  }

  // El último usuario queda con perfil privado a propósito: sirve para
  // confirmar a ojo (no solo con el test unitario) que su actividad no
  // aparece en los bloques de Inicio pese a tener ratings/listas públicas.
  const privateUserId = userIds[userIds.length - 1]!;
  await updateProfileVisibility(privateUserId, "private");
  console.log(`  ${USER_NAMES[USER_NAMES.length - 1]} queda con perfil privado (control de exclusión)`);

  console.log("💬 generando actividad...");
  for (const userId of userIds) {
    // `rating.updated_at` está protegido por trigger (trg_rating_touch en
    // drizzle/0000_initial.sql: "se mantiene por trigger, nunca desde la
    // app") y es justamente el campo que el feed usa como fecha — no hay
    // forma legítima de backdatear un rating, ni tendría sentido intentarlo:
    // la garantía existe para que nadie pueda falsear cuándo tocó por
    // última vez su valoración. Queda con la fecha real de creación.
    for (const target of pick(ratableTargets, 3)) {
      const stars = randomStars();
      const resolved = await resolveSocialTarget(target.type, target.id);
      await upsertRating(resolved, userId, stars, detailedScoreFor(stars));
    }

    // `comment` no tiene `updated_at` (solo `created_at`, sin trigger) — acá
    // sí se puede backdatear de forma legítima.
    for (const target of pick(commentableTargets, 3)) {
      const resolved = await resolveSocialTarget(target.type, target.id);
      const created = await createComment(resolved, userId, randomOf(COMMENT_SNIPPETS));
      await db.update(comment).set({ createdAt: randomDate(DAYS_BACK) }).where(eq(comment.id, created.id));
      // A veces el mismo usuario valora el target que comentó — así "Comentarios
      // populares" muestra la valoración junto al comentario.
      if (Math.random() < 0.6) {
        const stars = randomStars();
        await upsertRating(resolved, userId, stars, detailedScoreFor(stars));
      }
    }

    // Mismo caso que `rating`: `user_list.updated_at` está protegido por
    // trigger (trg_user_list_updated_at, drizzle/0009) y es la fecha que
    // muestra el feed — queda con la fecha real de creación.
    const entityType = randomOf<SocialTargetType>(["artist", "release-group", "recording"]);
    const pool = byType[entityType];
    if (pool.length >= 2) {
      const items = pick(pool, Math.min(4, pool.length));
      const list = await createList({ ownerId: userId, entityType, title: randomOf(LIST_TITLES[entityType]), audience: "public" });
      for (const item of items) {
        await addItemToList(list.id, userId, { type: item.type, id: item.id });
      }
    }
  }

  console.log("✅ seed-home: listo.");
  console.log(`   Usuarios: seed_home_*_${suffix} (contraseña: ${PASSWORD})`);
  console.log("   Para limpiar TODO lo generado por este script (cualquier corrida):");
  console.log("     DELETE FROM app_user WHERE username LIKE 'seed_home_%';");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ seed-home falló:", error);
    process.exit(1);
  });
