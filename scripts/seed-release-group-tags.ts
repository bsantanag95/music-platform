export {};

// Seed de tags de género por álbum (release_group_tag), para poder diseñar y
// revisar la "cresta de géneros" de la huella de gusto del perfil
// (cambio redesign-user-profile) ANTES de que exista ingesta real de
// géneros/tags desde MusicBrainz.
//
// No inventa catálogo: solo asocia tags de género a los release_group que YA
// están en la BD, derivándolos del nombre del artista principal mediante un
// diccionario curado. Los artistas fuera del diccionario reciben un tag
// genérico por categoría del álbum, para que la cresta nunca quede vacía en
// una BD poblada.
//
// Idempotente: ON CONFLICT (release_group_id, tag) DO NOTHING. Correr de nuevo
// tras añadir artistas al diccionario solo agrega las filas nuevas.
//
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/seed-release-group-tags.ts
//
// Para limpiar todo lo que sembró este script:
//   DELETE FROM release_group_tag;
// (cuando llegue la ingesta real, ese script/migración reemplaza esta tabla)

import { sql } from "drizzle-orm";
import { assertSeedAllowed } from "./assert-seed-allowed";
import { db } from "../src/db";
import { releaseGroupTag } from "../src/db/schema";

assertSeedAllowed();

// Diccionario curado: nombre de artista en minúsculas -> tags de género.
// Tags reales de MusicBrainz (los mismos slugs que usa su taxonomía de
// géneros) para que el reemplazo por ingesta real sea transparente.
const ARTIST_GENRES: Record<string, string[]> = {
  "pink floyd": ["progressive rock", "psychedelic rock", "art rock"],
  "roger waters": ["progressive rock", "art rock"],
  radiohead: ["alternative rock", "art rock", "electronic"],
  "fiona apple": ["singer-songwriter", "art pop", "chamber pop"],
  "kendrick lamar": ["hip hop", "conscious hip hop", "west coast hip hop"],
  "tame impala": ["psychedelic rock", "neo-psychedelia", "synth-pop"],
  "fleetwood mac": ["soft rock", "pop rock", "blues rock"],
  "kate bush": ["art pop", "art rock", "baroque pop"],
  "aphex twin": ["idm", "electronic", "ambient techno"],
  "the beatles": ["rock", "pop rock", "psychedelic pop"],
  "miles davis": ["jazz", "modal jazz", "jazz fusion"],
  "john coltrane": ["jazz", "modal jazz", "free jazz"],
  portishead: ["trip hop", "downtempo", "electronic"],
  bjork: ["art pop", "electronic", "experimental"],
  "björk": ["art pop", "electronic", "experimental"],
  "nine inch nails": ["industrial rock", "alternative rock", "electronic"],
  "talking heads": ["new wave", "post-punk", "art rock"],
  "d'angelo": ["neo soul", "r&b", "funk"],
  "the velvet underground": ["art rock", "proto-punk", "experimental rock"],
  slowdive: ["shoegaze", "dream pop"],
};

// Tag genérico por categoría de release_group cuando el artista no está en el
// diccionario (category: 'studio' | 'single_ep' | 'compilation' | 'live_other').
const CATEGORY_FALLBACK: Record<string, string> = {
  studio: "rock",
  single_ep: "pop",
  compilation: "pop",
  live_other: "rock",
};

interface ReleaseGroupRow {
  id: string;
  category: string;
  artist_name: string | null;
}

async function main(): Promise<void> {
  const result = await db.execute(sql`
    SELECT rg.id,
           rg.category,
           (
             SELECT a.name
             FROM credit c
             JOIN artist a ON a.id = c.artist_id
             WHERE c.release_group_id = rg.id
               AND c.role = 'primary'
               AND c.recording_id IS NULL
             ORDER BY c.position ASC
             LIMIT 1
           ) AS artist_name
    FROM release_group rg
  `);

  const list = Array.from(result as Iterable<ReleaseGroupRow>);
  if (list.length === 0) {
    console.log("No hay release_group en la BD. Nada que sembrar.");
    await db.$client.end({ timeout: 5 });
    return;
  }

  const values: { releaseGroupId: string; tag: string; count: number }[] = [];
  let matched = 0;
  for (const rg of list) {
    const key = rg.artist_name?.trim().toLowerCase() ?? "";
    const tags = ARTIST_GENRES[key];
    if (tags) {
      matched += 1;
      tags.forEach((tag, i) => values.push({ releaseGroupId: rg.id, tag, count: 5 - i }));
    } else {
      const fallback = CATEGORY_FALLBACK[rg.category] ?? "rock";
      values.push({ releaseGroupId: rg.id, tag: fallback, count: 1 });
    }
  }

  // Insert en lotes con ON CONFLICT DO NOTHING (idempotente).
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < values.length; i += BATCH) {
    const chunk = values.slice(i, i + BATCH);
    const res = await db
      .insert(releaseGroupTag)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ releaseGroupId: releaseGroupTag.releaseGroupId });
    inserted += res.length;
  }

  console.log(
    `release_group: ${list.length} · con artista en diccionario: ${matched} · ` +
      `filas de tag insertadas: ${inserted} (idempotente)`,
  );
  await db.$client.end({ timeout: 5 });
}

main().catch((err) => {
  console.error("Error sembrando release_group_tag:", err);
  process.exit(1);
});
