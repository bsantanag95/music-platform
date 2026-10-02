export {}; // fuerza module scope
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FamilyKey } from "../src/services/genres/families";
import { assertSmokeAllowed } from "./assert-smoke-allowed";
import { SMOKE_PREFIX, smokeMbid } from "./smoke-album-fixtures";

assertSmokeAllowed();

// Smoke test de la taxonomía de géneros y las semillas de Wikidata contra Postgres real
// (openspec: add-genre-taxonomy, ADR 0023). Mockea `global.fetch` (MusicBrainz y Wikidata) y
// verifica: la carga idempotente de la taxonomía; el retiro de un género (queda oculto y conserva
// sus semillas); las semillas del artista (P136 de la misma entidad, rango, descarte de lo que no
// traduce); la entidad de Wikidata de cada álbum desde el browse de discografía; las semillas de
// álbum en lote; la herencia acotada a 3 en la vista `release_group_effective_genre`; y Explorar por
// familia y por género con subgéneros.
//
// La taxonomía se carga COMPLETA (la real de data/genres/taxonomy.json más 6 géneros sintéticos con
// MBID `5e0ce000-…` y slugs `smoke-*`): cargar solo los sintéticos ocultaría los reales. Al terminar
// (también si falla) borra el artista, sus álbumes y los géneros sintéticos; la taxonomía real queda
// cargada tal como está en el archivo.

let failures = 0;
function check(condition: boolean, message: string) {
  console.log(`${condition ? "✅" : "❌"} ${message}`);
  if (!condition) failures++;
}

const G = {
  rock: smokeMbid(SMOKE_PREFIX, 0x7001),
  shoegaze: smokeMbid(SMOKE_PREFIX, 0x7002),
  trap: smokeMbid(SMOKE_PREFIX, 0x7003),
  trapLatino: smokeMbid(SMOKE_PREFIX, 0x7004),
  folk: smokeMbid(SMOKE_PREFIX, 0x7005),
  hidden: smokeMbid(SMOKE_PREFIX, 0x7006),
};
const QID = {
  rock: "Q900000101",
  shoegaze: "Q900000102",
  trap: "Q900000103",
  trapLatino: "Q900000104",
  folk: "Q900000105",
  hidden: "Q900000106",
  unmapped: "Q900000199",
  artist: "Q900000201",
  album: "Q900000202",
};
const BAND = smokeMbid(SMOKE_PREFIX, 0x7101);
const ALBUM_LINKED = smokeMbid(SMOKE_PREFIX, 0x7201);
const ALBUM_UNLINKED = smokeMbid(SMOKE_PREFIX, 0x7202);

type Relations = { subgenreOf?: string[]; fusionOf?: string[] };
const fixtureGenre = (
  mbid: string,
  slug: string,
  wikidataId: string,
  families: FamilyKey[],
  kind: "style" | "hidden" = "style",
  { subgenreOf = [], fusionOf = [] }: Relations = {},
) => ({ mbid, slug, name: slug.replace(/-/g, " "), nameEs: null, wikidataId, kind, families, subgenreOf, fusionOf, influencedBy: [] });

const FIXTURE_GENRES = [
  fixtureGenre(G.rock, "smoke-rock", QID.rock, ["rock"]),
  fixtureGenre(G.shoegaze, "smoke-shoegaze", QID.shoegaze, ["rock"], "style", { subgenreOf: [G.rock] }),
  fixtureGenre(G.trap, "smoke-trap", QID.trap, ["hip-hop"]),
  fixtureGenre(G.trapLatino, "smoke-trap-latino", QID.trapLatino, ["hip-hop", "latin"], "style", { subgenreOf: [G.trap] }),
  fixtureGenre(G.folk, "smoke-folk", QID.folk, ["folk"]),
  fixtureGenre(G.hidden, "smoke-hidden", QID.hidden, [], "hidden"),
];

const genreClaims = (...ids: string[]) => ({
  P136: ids.map((id) => ({ mainsnak: { datavalue: { value: { id } } }, rank: "normal" })),
});

// Entidades de Wikidata: el artista lista 4 géneros traducibles + uno oculto + uno sin traducción.
const entities: Record<string, unknown> = {
  [QID.artist]: {
    id: QID.artist,
    claims: genreClaims(QID.shoegaze, QID.unmapped, QID.trap, QID.hidden, QID.trapLatino, QID.folk),
  },
  [QID.album]: { id: QID.album, claims: genreClaims(QID.trapLatino) },
};

const credit = [{ name: "Banda de géneros (smoke)", artist: { id: BAND, name: "Banda de géneros (smoke)" } }];
const browse = {
  "release-group-count": 2,
  "release-group-offset": 0,
  "release-groups": [
    {
      id: ALBUM_LINKED,
      title: "Álbum enlazado (smoke)",
      "primary-type": "Album",
      "secondary-types": [],
      "first-release-date": "2001",
      "artist-credit": credit,
      relations: [{ type: "wikidata", "target-type": "url", url: { resource: `https://www.wikidata.org/wiki/${QID.album}` } }],
    },
    {
      id: ALBUM_UNLINKED,
      title: "Álbum sin entidad (smoke)",
      "primary-type": "Album",
      "secondary-types": ["Soundtrack"],
      "first-release-date": "2002",
      "artist-credit": credit,
    },
  ],
};

async function main() {
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { and, eq, inArray, like, sql } = await import("drizzle-orm");
  const { loadTaxonomy } = await import("../src/services/genres/taxonomy-load");
  const { upsertArtistFromMb } = await import("../src/services/catalog/ingest-artist");
  const { enrichArtistFromWikimedia } = await import("../src/services/catalog/artist-wikimedia");
  const { syncArtistDiscography } = await import("../src/services/catalog/ingest-discography");
  const { syncAlbumGenreSeeds } = await import("../src/services/genres/album-seeds");
  const { albumDescriptors } = await import("../src/services/genres/read");
  const { listAlbumsByFamily, listAlbumsByGenre } = await import("../src/services/discovery/discovery");
  type TaxonomyFile = import("../src/services/genres/taxonomy-build").TaxonomyFile;

  process.env.WIKIMEDIA_USER_AGENT ??= "music-platform-smoke (smoke@example.com)";
  process.env.MUSICBRAINZ_USER_AGENT ??= "music-platform-smoke (smoke@example.com)";
  const calls: string[] = [];
  const realFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.hostname === "musicbrainz.org") {
      calls.push(`mb:${url.pathname}:${url.searchParams.get("inc")}`);
      if (url.pathname === "/ws/2/release-group") return json(browse);
      throw new Error(`No hay mock de MusicBrainz para ${url}`);
    }
    if (url.hostname === "www.wikidata.org") {
      const ids = (url.searchParams.get("ids") ?? "").split("|");
      calls.push(`wd:${ids.join(",")}`);
      return json({ entities: Object.fromEntries(ids.map((id) => [id, entities[id] ?? { id, missing: "" }])) });
    }
    throw new Error(`No hay mock para: ${url}`);
  }) as typeof fetch;

  const real = JSON.parse(
    readFileSync(fileURLToPath(new URL("../data/genres/taxonomy.json", import.meta.url)), "utf8"),
  ) as TaxonomyFile;
  const withFixtures = (genres: typeof FIXTURE_GENRES): TaxonomyFile => ({ ...real, genres: [...real.genres, ...genres] });

  async function cleanup() {
    await db.delete(schema.artist).where(like(sql`${schema.artist.mbid}::text`, `${SMOKE_PREFIX}%`));
    await db.delete(schema.releaseGroup).where(like(sql`${schema.releaseGroup.mbid}::text`, `${SMOKE_PREFIX}%`));
    await db.delete(schema.genre).where(like(sql`${schema.genre.mbid}::text`, `${SMOKE_PREFIX}%`));
  }
  const genreId = async (mbid: string) =>
    (await db.select({ id: schema.genre.id }).from(schema.genre).where(eq(schema.genre.mbid, mbid)))[0]!.id;
  const effective = async (releaseGroupId: string) =>
    db
      .select({ slug: schema.genre.slug, inherited: schema.releaseGroupEffectiveGenre.inherited })
      .from(schema.releaseGroupEffectiveGenre)
      .innerJoin(schema.genre, eq(schema.genre.id, schema.releaseGroupEffectiveGenre.genreId))
      .where(eq(schema.releaseGroupEffectiveGenre.releaseGroupId, releaseGroupId))
      .orderBy(schema.releaseGroupEffectiveGenre.position);

  try {
    await cleanup();

    console.log("1) Carga de la taxonomía (real + sintética) idempotente");
    const first = await loadTaxonomy(withFixtures(FIXTURE_GENRES));
    check(first.inserted >= FIXTURE_GENRES.length, `géneros sintéticos insertados (${first.inserted} nuevos)`);
    const second = await loadTaxonomy(withFixtures(FIXTURE_GENRES));
    check(
      Object.values(second).every((n) => n === 0),
      `la segunda carga no cambia nada (${JSON.stringify(second)})`,
    );
    const members = await db
      .select({ family: schema.genreFamilyMember.familyKey })
      .from(schema.genreFamilyMember)
      .where(eq(schema.genreFamilyMember.genreId, await genreId(G.trapLatino)));
    check(members.map((m) => m.family).sort().join(",") === "hip-hop,latin", "smoke-trap-latino en Hip hop y Latina");

    console.log("2) Semillas del artista desde P136 de la misma entidad");
    const band = await upsertArtistFromMb(BAND, "Banda de géneros (smoke)", "Group", null);
    await db
      .update(schema.artist)
      .set({ wikidataId: QID.artist })
      .where(eq(schema.artist.id, band.id));
    const enriched = await enrichArtistFromWikimedia(band.id, { force: true });
    check(enriched.status === "enriched", `enriquecido (${enriched.status})`);
    check(calls.filter((c) => c.startsWith("wd:")).length === 1, "una sola consulta a Wikidata para el artista");
    const artistSeeds = await db
      .select({ slug: schema.genre.slug })
      .from(schema.artistGenreSeed)
      .innerJoin(schema.genre, eq(schema.genre.id, schema.artistGenreSeed.genreId))
      .where(eq(schema.artistGenreSeed.artistId, band.id))
      .orderBy(schema.artistGenreSeed.position);
    check(
      artistSeeds.map((s) => s.slug).join(",") === "smoke-shoegaze,smoke-trap,smoke-trap-latino,smoke-folk",
      `semillas en orden, sin el oculto ni el QID sin traducción (${artistSeeds.map((s) => s.slug).join(", ")})`,
    );

    console.log("3) Entidad de Wikidata de cada álbum desde el browse de discografía");
    calls.length = 0;
    const disco = await syncArtistDiscography(band.id, { mode: "initial" });
    check(disco.status === "complete", `discografía sincronizada (${disco.status})`);
    check(calls.some((c) => c === "mb:/ws/2/release-group:artist-credits+url-rels"), "el browse pide url-rels y ningún género");
    const albums = await db
      .select()
      .from(schema.releaseGroup)
      .where(inArray(schema.releaseGroup.mbid, [ALBUM_LINKED, ALBUM_UNLINKED]));
    const linked = albums.find((a) => a.mbid === ALBUM_LINKED)!;
    const unlinked = albums.find((a) => a.mbid === ALBUM_UNLINKED)!;
    check(linked.wikidataId === QID.album && unlinked.wikidataId === null, "QID guardado solo donde MusicBrainz lo declara");

    console.log("4) Semillas de álbum en lote");
    calls.length = 0;
    const seeded = await syncAlbumGenreSeeds(band.id);
    check(
      seeded.albums === 2 && seeded.withoutEntity === 1 && seeded.seeded === 1 && seeded.requests === 1,
      `dos álbumes, una request (${JSON.stringify(seeded)})`,
    );
    const again = await syncAlbumGenreSeeds(band.id);
    check(again.albums === 0, "vigentes: la segunda corrida no consulta nada");

    console.log("5) Géneros efectivos y herencia acotada a 3");
    const own = await effective(linked.id);
    check(own.length === 1 && own[0]!.slug === "smoke-trap-latino" && !own[0]!.inherited, "el álbum enlazado usa sus semillas propias");
    const inherited = await effective(unlinked.id);
    check(
      inherited.map((g) => g.slug).join(",") === "smoke-shoegaze,smoke-trap,smoke-trap-latino" && inherited.every((g) => g.inherited),
      `el álbum sin entidad hereda solo los 3 primeros (${inherited.map((g) => g.slug).join(", ")})`,
    );
    const descriptors = await albumDescriptors([unlinked.id]);
    check(descriptors.get(unlinked.id)?.join(",") === "soundtrack", "Banda sonora sale del tipo Soundtrack");

    console.log("6) Explorar por familia y por género con subgéneros");
    const ids = (page: { albums: { id: string }[] }) => new Set(page.albums.map((a) => a.id));
    const smokeIds = (page: { albums: { id: string }[] }) => [...ids(page)].filter((id) => id === linked.id || id === unlinked.id);
    // Las páginas pueden traer álbumes reales del scratch; se miran solo los sintéticos.
    const latin = await allPages((p) => listAlbumsByFamily("latin", p));
    check(smokeIds(latin).length === 2, "familia Latina: álbum propio y heredado");
    const rockTree = await allPages((p) => listAlbumsByGenre("smoke-rock", p));
    check(
      smokeIds(rockTree).join(",") === unlinked.id,
      "género smoke-rock incluye su subgénero smoke-shoegaze (solo el heredado lo tiene)",
    );
    const folk = await listAlbumsByGenre("smoke-folk");
    check(smokeIds(folk).length === 0, "el 4.º género del artista no se hereda");
    const unknown = await listAlbumsByFamily("inexistente");
    check(unknown.albums.length === 0 && unknown.family === null, "una familia desconocida da la página vacía");

    console.log("7) Un género retirado queda oculto y conserva sus semillas");
    const retired = await loadTaxonomy(withFixtures(FIXTURE_GENRES.filter((g) => g.mbid !== G.trapLatino)));
    check(retired.hidden === 1, `un género ocultado (${retired.hidden})`);
    const [kind] = await db.select({ kind: schema.genre.kind }).from(schema.genre).where(eq(schema.genre.mbid, G.trapLatino));
    check(kind?.kind === "hidden", "smoke-trap-latino quedó oculto");
    const kept = await db
      .select()
      .from(schema.releaseGroupGenreSeed)
      .where(and(eq(schema.releaseGroupGenreSeed.releaseGroupId, linked.id), eq(schema.releaseGroupGenreSeed.genreId, await genreId(G.trapLatino))));
    check(kept.length === 1, "la semilla del álbum sigue guardada");
    // Sin semillas propias visibles, el álbum vuelve a heredar (3 primeros estilos visibles del artista).
    const afterRetire = await effective(linked.id);
    check(
      afterRetire.map((g) => g.slug).join(",") === "smoke-shoegaze,smoke-trap,smoke-folk" && afterRetire.every((g) => g.inherited),
      `la vista ya no lo muestra y el álbum hereda (${afterRetire.map((g) => g.slug).join(", ")})`,
    );
  } finally {
    global.fetch = realFetch;
    await cleanup();
    console.log("\nFixtures borrados (la taxonomía real queda cargada).");
  }

  console.log(failures === 0 ? "\n✅ Smoke test de géneros OK" : `\n❌ ${failures} verificación(es) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

/** Junta las páginas de un listado (los sintéticos pueden caer en cualquier página). */
async function allPages(list: (page: number) => Promise<{ albums: { id: string }[]; hasNext: boolean }>) {
  const albums: { id: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const result = await list(page);
    albums.push(...result.albums);
    if (!result.hasNext) break;
  }
  return { albums };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
