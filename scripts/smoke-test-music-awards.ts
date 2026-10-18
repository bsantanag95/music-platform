export {};

// Smoke test del cambio add-music-awards contra Postgres REAL (ADR 0032): los CHECK de la migración 0068, la carga
// idempotente (la segunda corrida no reescribe ninguna fila), que la carga no consulta MusicBrainz (fetch bloqueado),
// los stubs de catálogo desde la semilla (con créditos y disco ancla), que un archivo inválido aborta sin escribir,
// la lectura de la ceremonia y la historia, el ON DELETE SET NULL y el borrado de lo que ya no está en los archivos.
// Desde `add-four-music-awards` (migración 0073) también verifica los CHECK de `award.voting` y `award_ceremony.source_url`, que
// la carga los escribe de forma idempotente y la ceremonia más reciente de cada premio (`listLatestCeremoniesByAward`).
// Usa un premio sintético `smoke-premio` en una carpeta temporal (no toca `data/awards/`) y MBID
// `5e0ce000-0000-4000-8000-00000000a8xx`; borra todo al terminar (también si falla). Si se interrumpió, limpiar con
//   DELETE FROM award WHERE slug LIKE 'smoke-%';
//   DELETE FROM recording WHERE mbid::text LIKE '5e0ce000%';
//   DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000%';
//   DELETE FROM artist WHERE mbid::text LIKE '5e0ce000%';
// (el ON DELETE CASCADE de `award` limpia ceremonias, categorías y nominaciones). Necesita las migraciones 0068 y 0073.
//   ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/smoke-test-music-awards.ts

import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq, inArray, like, sql } from "drizzle-orm";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { db } from "../src/db";
import { artist, award, awardNomination, credit, recording, releaseGroup } from "../src/db/schema";
import { readAllAwards } from "../src/services/awards/curation-files";
import { loadAward } from "../src/services/awards/load";
import { getCategoryHistory, getCeremonyPage, getLatestCeremonyYear, listLatestCeremoniesByAward } from "../src/services/awards/read";

assertSmokeAllowed();

const SLUG = "smoke-premio";
const MB = (n: number) => `5e0ce000-0000-4000-8000-00000000a8${String(n).padStart(2, "0")}`;
const ALBUM = MB(1);
const ANCHOR = MB(2);
const SONG = MB(3);
const NEW_ARTIST = MB(4);
const CREDITED = MB(5);

function check(condition: unknown, message: string): void {
  if (!condition) throw new Error(`FALLÓ: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function codeOf(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    return e.code ?? e.cause?.code ?? "SIN_CODIGO";
  }
}

const credits = [{ name: "Smoke Banda", artist: { id: CREDITED, name: "Smoke Banda" } }];
const categoriesFile = {
  award: SLUG,
  voting: "mixed",
  categories: [
    { key: "album-of-the-year", tier: "general", subject: "release_group", name: { es: "Álbum del año", en: "Album of the Year" }, order: 1 },
    { key: "record-of-the-year", tier: "general", subject: "recording", name: { es: "Grabación del año", en: "Record of the Year" }, order: 2 },
    { key: "best-new-artist", tier: "general", subject: "artist", name: { es: "Mejor artista nuevo", en: "Best New Artist" }, order: 3 },
    { key: "best-smoke-album", tier: "album", subject: "release_group", name: { es: "Mejor álbum smoke", en: "Best Smoke Album" }, order: 4 },
    { key: "best-old-smoke-album", tier: "album", subject: "release_group", name: { es: "Álbum smoke (antes)", en: "Old Smoke Album" }, order: 5 },
    // Nivel de género: exige campo (migración 0072) y sale al final, después de los álbumes.
    { key: "best-smoke-performance", tier: "genre", field: "pop", subject: "recording", name: { es: "Mejor interpretación smoke", en: "Best Smoke Performance" }, order: 6 },
  ],
};
// La categoría nueva declara su predecesora (se agrega en la segunda escritura del archivo).
const withPredecessor = {
  ...categoriesFile,
  categories: categoriesFile.categories.map((c) => (c.key === "best-smoke-album" ? { ...c, predecessor: "best-old-smoke-album" } : c)),
};

const ceremony = (year: number, edition: number) => ({
  award: SLUG,
  year,
  edition,
  heldOn: `${year}-02-02`,
  sourceUrl: "https://example.org/smoke",
  categories: [
    {
      key: "album-of-the-year",
      coverage: "complete",
      nominees: [
        { title: "Smoke Álbum", artist: "Smoke Banda", won: false, resolved: { status: "exact", mbid: ALBUM, seed: { kind: "release_group", title: "Smoke Álbum", category: "studio", firstReleaseDate: "2024-05-01", credits } } },
        { title: "Sin Resolver", artist: "Nadie", won: true, resolved: { status: "ambiguous", candidates: [] } },
        // Una categoría `complete` necesita al menos tres nominados.
        { title: "Tercero", artist: "Alguien", won: false },
      ],
    },
    {
      key: "record-of-the-year",
      coverage: "winner_only",
      nominees: [
        {
          title: "Smoke Canción",
          artist: "Smoke Banda",
          anchor: { title: "Smoke Sencillo", artist: "Smoke Banda" },
          won: true,
          credits: "Productora Smoke",
          resolved: {
            status: "manual",
            mbid: SONG,
            seed: {
              kind: "recording",
              title: "Smoke Canción",
              durationSec: 200,
              credits,
              anchorMbid: ANCHOR,
              anchor: { kind: "release_group", title: "Smoke Sencillo", category: "single_ep", credits },
            },
          },
        },
      ],
    },
    {
      key: "best-new-artist",
      coverage: "winner_only",
      nominees: [{ title: "Smoke Nueva", won: true, resolved: { status: "exact", mbid: NEW_ARTIST, seed: { kind: "artist", name: "Smoke Nueva", mbType: "Person", disambiguation: null } } }],
    },
    { key: year === 2025 ? "best-smoke-album" : "best-old-smoke-album", coverage: "winner_only", nominees: [{ title: "Otro Disco", artist: "Otra", won: true }] },
    ...(year === 2025
      ? [
          {
            key: "best-smoke-performance",
            coverage: "winner_only",
            nominees: [
              {
                title: "Smoke Canción",
                artist: "Smoke Banda",
                anchor: { title: "Smoke Sencillo", artist: "Smoke Banda" },
                won: true,
                resolved: {
                  status: "manual",
                  mbid: SONG,
                  seed: {
                    kind: "recording",
                    title: "Smoke Canción",
                    durationSec: 200,
                    credits,
                    anchorMbid: ANCHOR,
                    anchor: { kind: "release_group", title: "Smoke Sencillo", category: "single_ep", credits },
                  },
                },
              },
            ],
          },
        ]
      : []),
  ],
});

function writeFiles(dir: string, files: { categories: unknown; ceremonies: Record<number, unknown> }) {
  const awardDir = join(dir, SLUG);
  rmSync(awardDir, { recursive: true, force: true });
  mkdirSync(join(awardDir, "ceremonies"), { recursive: true });
  writeFileSync(join(awardDir, "categories.json"), JSON.stringify(files.categories));
  for (const [year, data] of Object.entries(files.ceremonies)) writeFileSync(join(awardDir, "ceremonies", `${year}.json`), JSON.stringify(data));
}

async function loadDir(dir: string) {
  const { awards, errors } = readAllAwards(dir);
  if (errors.length) throw new Error(`Archivos inválidos:\n${errors.join("\n")}`);
  return loadAward(awards[0]!);
}

/** `xmin` de las nominaciones del premio: si una carga reescribe una fila, cambia. */
async function nominationVersions(): Promise<string> {
  const rows = await db.execute<{ v: string }>(sql`
    SELECT string_agg(n.id::text || ':' || n.xmin::text, ',' ORDER BY n.id) AS v
    FROM award_nomination n
    JOIN award_category_edition e ON e.id = n.category_edition_id
    JOIN award_ceremony c ON c.id = e.ceremony_id
    JOIN award a ON a.id = c.award_id
    WHERE a.slug = ${SLUG}`);
  return rows[0]?.v ?? "";
}

/** `xmin` del premio y de sus ceremonias: si una carga reescribe alguna fila, cambia. */
async function awardVersions(): Promise<string> {
  const rows = await db.execute<{ v: string }>(sql`
    SELECT a.xmin::text || ':' || coalesce(string_agg(c.xmin::text, ',' ORDER BY c.year), '') AS v
    FROM award a
    LEFT JOIN award_ceremony c ON c.award_id = a.id
    WHERE a.slug = ${SLUG}
    GROUP BY a.id`);
  return rows[0]?.v ?? "";
}

async function cleanup() {
  await db.delete(award).where(like(award.slug, "smoke-%"));
  await db.delete(recording).where(sql`${recording.mbid}::text LIKE '5e0ce000-0000-4000-8000-00000000a8%'`);
  await db.delete(releaseGroup).where(sql`${releaseGroup.mbid}::text LIKE '5e0ce000-0000-4000-8000-00000000a8%'`);
  await db.delete(artist).where(sql`${artist.mbid}::text LIKE '5e0ce000-0000-4000-8000-00000000a8%'`);
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), "smoke-awards-"));
  const realFetch = global.fetch;
  // La carga no debe salir a internet: cualquier fetch hace fallar el smoke.
  global.fetch = (() => {
    throw new Error("fetch durante la carga de premios");
  }) as typeof fetch;
  await cleanup();
  try {
    console.log("\nCHECK de la migración 0068");
    const [a] = await db.insert(award).values({ slug: SLUG }).returning();
    check(
      (await codeOf(() => db.execute(sql`INSERT INTO award_ceremony (award_id, year, edition, held_on) VALUES (${a!.id}, 2025, 1, '2024-12-31')`))) === "23514",
      "held_on de otro año que la ceremonia se rechaza",
    );
    check(
      (await codeOf(() => db.execute(sql`INSERT INTO award (slug) VALUES ('Mal Slug')`))) === "23514",
      "un slug con mayúsculas o espacios se rechaza",
    );
    check(
      (await codeOf(() => db.execute(sql`INSERT INTO award (slug, voting) VALUES ('smoke-votacion', 'fans')`))) === "23514",
      "un tipo de votación desconocido se rechaza (0073)",
    );
    check(
      (await codeOf(() => db.execute(sql`INSERT INTO award_ceremony (award_id, year, edition, held_on, source_url) VALUES (${a!.id}, 2025, 1, '2025-02-02', 'javascript:alert(1)')`))) === "23514",
      "una fuente que no es http(s) se rechaza (0073)",
    );
    check(
      (await codeOf(() => db.execute(sql`INSERT INTO award (slug, voting) VALUES ('smoke-votacion', 'jury')`))) === null,
      "un premio con votación válida y las ceremonias sin fuente (nulas) se aceptan",
    );
    await db.delete(award).where(like(award.slug, "smoke-%"));

    console.log("\nPrimera carga");
    writeFiles(dir, { categories: categoriesFile, ceremonies: { 2024: ceremony(2024, 1), 2025: ceremony(2025, 2) } });
    const first = await loadDir(dir);
    check(first.stubsCreated === 4, `crea 4 stubs (álbum, disco ancla, grabación, artista); creó ${first.stubsCreated}`);
    const [album] = await db.select().from(releaseGroup).where(eq(releaseGroup.mbid, ALBUM));
    check(album?.title === "Smoke Álbum" && album.category === "studio", "el stub del álbum sale de la semilla");
    const albumCredits = await db.select().from(credit).where(eq(credit.releaseGroupId, album!.id));
    check(albumCredits.length === 1, "el stub del álbum trae su crédito de artista");
    const [rec] = await db.select().from(recording).where(eq(recording.mbid, SONG));
    check(rec?.durationSec === 200, "la grabación se crea desde la semilla, sin MusicBrainz");
    const [newArtist] = await db.select().from(artist).where(eq(artist.mbid, NEW_ARTIST));
    check(newArtist?.type === "person", "el artista se crea con su tipo real");

    console.log("\nSegunda carga (idempotencia)");
    const before = await nominationVersions();
    const beforeAward = await awardVersions();
    const second = await loadDir(dir);
    check(second.stubsCreated === 0, "no crea stubs nuevos");
    check(second.ceremonies.every((c) => c.rewritten === 0), "no reescribe ninguna categoría");
    check((await nominationVersions()) === before, "ninguna fila de nominación cambió (xmin igual)");
    check((await awardVersions()) === beforeAward, "el premio y sus ceremonias tampoco cambiaron (voting y source_url se escriben una vez)");

    console.log("\nLectura");
    const page = await getCeremonyPage(SLUG, 2025);
    check(page !== null && page.ceremonies.map((c) => c.year).join() === "2025,2024", "la ceremonia lista las otras, de la más reciente");
    check(
      page!.categories.map((c) => c.key).join() === "album-of-the-year,record-of-the-year,best-new-artist,best-smoke-album,best-smoke-performance",
      "niveles en orden (general, álbum, género), cada uno en el orden curado",
    );
    check(
      page!.categories.map((c) => c.tier).join() === "general,general,general,album,genre" &&
        page!.categories[4]!.field === "pop" &&
        page!.categories[3]!.field === null,
      "el nivel de género trae su campo y los demás niveles no",
    );
    const aoty = page!.categories[0]!;
    check(aoty.nominations[0]!.won && aoty.nominations[0]!.subject === null, "el ganador va primero; sin resolver queda como texto");
    check(aoty.nominations[1]!.subject?.kind === "release_group", "el álbum resuelto enlaza al catálogo");
    const roty = page!.categories[1]!.nominations[0]!;
    check(roty.subject?.kind === "recording" && roty.subject.anchor?.title === "Smoke Sencillo", "la grabación trae su disco ancla");
    check(roty.credit === "Productora Smoke", "los créditos curados se leen");
    check(page!.categories[2]!.coverage === "winner_only", "la cobertura winner_only se conserva");
    check(page!.voting === "mixed", "la ceremonia trae el tipo de votación del premio");
    check(page!.sourceUrl === "https://example.org/smoke", "y la fuente de la ceremonia");
    check((await getCeremonyPage(SLUG, 1999)) === null, "un año sin ceremonia no existe");
    check((await getLatestCeremonyYear(SLUG)) === 2025, "la ceremonia más reciente del premio es la de 2025 (redirección de /awards/<premio>)");
    check((await getLatestCeremonyYear("premio-que-no-existe")) === null, "un premio inexistente no tiene ceremonia más reciente");

    console.log("\nCeremonia más reciente por premio");
    // Un segundo premio con una ceremonia más antigua: ninguno de los dos se pierde y van de la más reciente a la más antigua.
    const [other] = await db.insert(award).values({ slug: "smoke-otro", voting: "jury" }).returning();
    await db.execute(sql`INSERT INTO award_ceremony (award_id, year, edition, held_on) VALUES (${other!.id}, 2022, 7, '2022-09-08')`);
    const latest = (await listLatestCeremoniesByAward()).filter((c) => c.awardSlug.startsWith("smoke-"));
    check(latest.map((c) => `${c.awardSlug}:${c.year}`).join() === `${SLUG}:2025,smoke-otro:2022`, "una ceremonia por premio, la más reciente de cada uno, de la más reciente a la más antigua");
    check(latest[0]!.headline?.category.es === "Álbum del año" && latest[0]!.headline.winner.text.startsWith("Sin Resolver"), "el ganador destacado es el de Álbum del año");
    check(latest[1]!.headline === null, "un premio sin categoría general de álbum con ganador muestra la tarjeta sin ganador");
    await db.delete(award).where(eq(award.slug, "smoke-otro"));

    console.log("\nPredecesora e historia");
    writeFiles(dir, { categories: withPredecessor, ceremonies: { 2024: ceremony(2024, 1), 2025: ceremony(2025, 2) } });
    await loadDir(dir);
    const history = await getCategoryHistory(SLUG, "best-smoke-album");
    check(history?.predecessor?.key === "best-old-smoke-album", "la categoría muestra su predecesora");
    const old = await getCategoryHistory(SLUG, "best-old-smoke-album");
    check(old?.successors.map((s) => s.key).join() === "best-smoke-album", "la predecesora muestra su sucesora");
    const aotyHistory = await getCategoryHistory(SLUG, "album-of-the-year");
    check(aotyHistory?.entries.map((e) => e.ceremony.year).join() === "2025,2024", "la historia va de la más reciente a la más antigua");

    console.log("\nCHECK de nivel y campo (migración 0072)");
    const [smokeAward] = await db.select({ id: award.id }).from(award).where(eq(award.slug, SLUG));
    const insertCategory = async (key: string, tier: string, field: string | null) => {
      try {
        await db.execute(sql`
          insert into award_category (award_id, key, tier, field, subject_kind, name_es, name_en, sort_order)
          values (${smokeAward!.id}, ${key}, ${tier}, ${field}, 'recording', 'x', 'x', 99)
        `);
        return true;
      } catch {
        return false;
      }
    };
    check(!(await insertCategory("smoke-sin-campo", "genre", null)), "la base rechaza una categoría de género sin campo");
    check(!(await insertCategory("smoke-nivel-raro", "otro", null)), "la base rechaza un nivel desconocido");
    check(!(await insertCategory("smoke-campo-malo", "genre", "Rock Alternativo")), "la base rechaza un campo que no es un slug");
    check(await insertCategory("smoke-album-sin-campo", "album", null), "un nivel de álbum no necesita campo");
    await db.execute(sql`delete from award_category where award_id = ${smokeAward!.id} and key = 'smoke-album-sin-campo'`);

    console.log("\nArchivo inválido");
    const invalid = ceremony(2025, 2);
    invalid.categories[2]!.nominees.push({ title: "No Ganó", won: false } as never);
    writeFiles(dir, { categories: withPredecessor, ceremonies: { 2024: ceremony(2024, 1), 2025: invalid } });
    const versions = await nominationVersions();
    let output = "";
    global.fetch = realFetch;
    try {
      execSync(`npx tsx --env-file=.env scripts/load-awards.ts --dir "${dir}"`, { stdio: "pipe" });
    } catch (error) {
      output = String((error as { stderr?: Buffer }).stderr ?? "");
    }
    check(
      output.includes("No se cargó nada") && output.includes("winner_only"),
      "el script de carga sale con el error de validación (winner_only con un no ganador)",
    );
    check((await nominationVersions()) === versions, "y no escribe nada");

    console.log("\nON DELETE SET NULL y retiro");
    await db.delete(releaseGroup).where(eq(releaseGroup.mbid, ALBUM));
    const [orphan] = await db.select().from(awardNomination).where(eq(awardNomination.nomineeText, "Smoke Álbum — Smoke Banda"));
    check(orphan !== undefined && orphan.releaseGroupId === null, "borrar el álbum deja la nominación como texto");
    writeFiles(dir, { categories: withPredecessor, ceremonies: { 2025: ceremony(2025, 2) } });
    global.fetch = (() => {
      throw new Error("fetch durante la carga de premios");
    }) as typeof fetch;
    const third = await loadDir(dir);
    check(third.ceremoniesRemoved === 1, "una ceremonia que ya no está en los archivos se borra");
    check((await getCeremonyPage(SLUG, 2024)) === null, "y deja de existir");
    const leftovers = await db.select({ id: awardNomination.id }).from(awardNomination).where(inArray(awardNomination.releaseGroupId, [album!.id]));
    check(leftovers.length === 0, "no quedan nominaciones apuntando al álbum borrado");

    console.log("\nSmoke de premios: OK");
  } finally {
    global.fetch = realFetch;
    await cleanup();
    rmSync(dir, { recursive: true, force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
