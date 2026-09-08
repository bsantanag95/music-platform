export {};

// Seed de la superficie de descubrimiento `/explore` (openspec: add-album-discovery).
//
// Crea:
//  1. la cuenta curadora `exploracion` (sin password_hash — no puede iniciar
//     sesión; perfil público);
//  2. un conjunto de colecciones destacadas: listas públicas de álbumes de esa
//     cuenta, con su fila en `user_list_featured` (rank).
//
// No inventa catálogo: las colecciones se arman a partir de los release_group
// que YA están en la BD. Idempotente (upsert por username / dueño+título /
// mbid). Correr de nuevo tras poblar más catálogo agrega solo lo nuevo.
//
// Las colecciones de este script son SEMILLA DERIVADA DE DATOS, no curaduría
// humana: garantizan que el riel editorial de `/explore` tenga contenido en
// cualquier BD poblada. Reemplazá su definición (COLLECTIONS) por picks reales
// cuando tengas curaduría de verdad — ver docs/05-features/explore.md.
//
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/seed-discovery.ts
//
// Para limpiar todo lo que sembró este script:
//   DELETE FROM app_user WHERE username = 'exploracion';
// (cascade borra sus listas, ítems y filas user_list_featured)

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { assertSeedAllowed } from "./assert-seed-allowed";
import { db } from "../src/db";
import { appUser, releaseGroup, userList, userListFeatured, userListItem } from "../src/db/schema";
import { CURATOR_DISPLAY_NAME, CURATOR_USERNAME } from "../src/services/discovery/constants";

assertSeedAllowed();

const CURATOR_EMAIL = "exploracion@curator.local";

interface CollectionSpec {
  title: string;
  rank: number;
  /** Selector: devuelve los ids de release_group (en orden) para esta colección. */
  select: () => Promise<string[]>;
}

const RECENT_STUDIO = async (limit: number) =>
  (
    await db
      .select({ id: releaseGroup.id })
      .from(releaseGroup)
      .where(and(eq(releaseGroup.category, "studio"), isNotNull(releaseGroup.firstReleaseYear)))
      .orderBy(desc(releaseGroup.firstReleaseYear), desc(releaseGroup.createdAt))
      .limit(limit)
  ).map((row) => row.id);

const ONE_PER_DECADE = async () => {
  // El studio más temprano de cada década con año conocido, décadas descendentes.
  const rows = await db
    .select({
      id: releaseGroup.id,
      decade: sql<number>`(floor(${releaseGroup.firstReleaseYear} / 10) * 10)::int`,
      year: releaseGroup.firstReleaseYear,
    })
    .from(releaseGroup)
    .where(and(eq(releaseGroup.category, "studio"), isNotNull(releaseGroup.firstReleaseYear)))
    .orderBy(desc(releaseGroup.firstReleaseYear));
  const perDecade = new Map<number, { id: string; year: number }>();
  for (const row of rows) {
    const current = perDecade.get(Number(row.decade));
    if (!current || Number(row.year) < current.year) {
      perDecade.set(Number(row.decade), { id: row.id, year: Number(row.year) });
    }
  }
  return [...perDecade.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, v]) => v.id);
};

const COLLECTIONS: CollectionSpec[] = [
  { title: "Novedades esenciales", rank: 1, select: () => RECENT_STUDIO(12) },
  { title: "Un disco por década", rank: 2, select: ONE_PER_DECADE },
];

async function upsertCurator(): Promise<string> {
  const [existing] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(appUser)
    .values({
      username: CURATOR_USERNAME,
      email: CURATOR_EMAIL,
      displayName: CURATOR_DISPLAY_NAME,
      passwordHash: null,
      profileVisibility: "public",
    })
    .onConflictDoNothing({ target: appUser.username })
    .returning({ id: appUser.id });
  if (created) return created.id;

  const [conflict] = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(eq(appUser.username, CURATOR_USERNAME))
    .limit(1);
  if (!conflict) throw new Error("No se pudo crear ni resolver la cuenta curadora");
  return conflict.id;
}

async function upsertCollection(ownerId: string, spec: CollectionSpec): Promise<void> {
  const albumIds = await spec.select();
  if (albumIds.length === 0) {
    console.warn(`  ⚠ "${spec.title}": sin álbumes en el catálogo, se omite`);
    return;
  }

  const [existing] = await db
    .select({ id: userList.id })
    .from(userList)
    .where(and(eq(userList.ownerId, ownerId), eq(userList.title, spec.title)))
    .limit(1);

  let listId = existing?.id;
  if (!listId) {
    const [created] = await db
      .insert(userList)
      .values({ ownerId, entityType: "release-group", title: spec.title, audience: "public" })
      .returning({ id: userList.id });
    listId = created!.id;
  }

  // Ítems: solo los que existen, en el orden del selector, sin duplicar.
  const present = new Set(
    (
      await db
        .select({ id: releaseGroup.id })
        .from(releaseGroup)
        .where(inArray(releaseGroup.id, albumIds))
    ).map((row) => row.id),
  );
  const alreadyIn = new Set(
    (
      await db
        .select({ id: userListItem.releaseGroupId })
        .from(userListItem)
        .where(eq(userListItem.listId, listId))
    ).map((row) => row.id),
  );

  let position = alreadyIn.size;
  for (const albumId of albumIds) {
    if (!present.has(albumId)) {
      console.warn(`  ⚠ "${spec.title}": álbum ${albumId} no está en el catálogo, se salta`);
      continue;
    }
    if (alreadyIn.has(albumId)) continue;
    position += 1;
    // Conflict target explícito sobre (list_id, release_group_id): la
    // restricción (list_id, position) es DEFERRABLE y PostgreSQL no la acepta
    // como árbitro de ON CONFLICT (error 55000) — mismo caso que addItemToList.
    await db
      .insert(userListItem)
      .values({ listId, releaseGroupId: albumId, position })
      .onConflictDoNothing({ target: [userListItem.listId, userListItem.releaseGroupId] });
  }

  // Marca destacada + orden. Tabla aparte: no toca user_list.updated_at.
  await db
    .insert(userListFeatured)
    .values({ listId, rank: spec.rank })
    .onConflictDoUpdate({ target: userListFeatured.listId, set: { rank: spec.rank } });

  console.log(`  ✓ "${spec.title}" (rank ${spec.rank}): ${present.size} álbumes`);
}

async function main() {
  const ownerId = await upsertCurator();
  console.log(`Cuenta curadora: @${CURATOR_USERNAME} (${ownerId})`);
  for (const spec of COLLECTIONS) {
    await upsertCollection(ownerId, spec);
  }
  console.log("Seed de descubrimiento al día.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error en el seed de descubrimiento:", error);
    process.exit(1);
  });
