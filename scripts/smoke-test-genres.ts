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
// álbum en lote; la herencia acotada a 3 en la vista `release_group_effective_genre`; Explorar por
// familia y por género con subgéneros; y (cambio show-genres) los géneros de las cabeceras, la página
// de género (relaciones, artistas), la búsqueda de géneros y la validación de la identidad musical; y
// (cambio add-genre-votes) los votos de la comunidad: elegibilidad, propuesta que reemplaza la herencia,
// puntaje con principal/secundarios, cifras desde 5 votantes, cuentas desactivadas, supervivencia del voto,
// semilla neutralizada por un −1, tope de 8, suspensión social y Explorar por el puntaje.
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
  const { albumDescriptors, identityGenreLabels } = await import("../src/services/genres/read");
  const { getAlbumGenres, getArtistGenres, getSongGenres } = await import("../src/services/genres/display");
  const { getGenrePage } = await import("../src/services/genres/page");
  const { searchGenres } = await import("../src/services/genres/search");
  const { updateMusicIdentity } = await import("../src/services/profiles/music-identity");
  const { registerUser } = await import("../src/services/auth/users");
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

  const userIds: string[] = [];
  async function cleanup() {
    for (const id of userIds) await db.delete(schema.appUser).where(eq(schema.appUser.id, id));
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

    console.log("6b) Géneros de las cabeceras, página de género y búsqueda");
    const artistGenres = await getArtistGenres(band.id);
    check(artistGenres.genres.map((g) => g.slug).join(",") === "smoke-shoegaze,smoke-trap,smoke-trap-latino,smoke-folk" && artistGenres.genres.every((g) => !g.inherited), "artista: sus semillas, todas propias");
    const albumInherited = await getAlbumGenres(unlinked.id);
    check(albumInherited.genres.length === 3 && albumInherited.genres.every((g) => g.inherited) && albumInherited.descriptors.join(",") === "soundtrack", "álbum heredado: 3 géneros marcados y Banda sonora");
    const songGenres = await getSongGenres(linked.id);
    check(songGenres.genres.length === 1 && songGenres.genres[0]!.inherited && songGenres.descriptors.length === 0, "canción: los del disco principal, heredados");
    const rockPage = await getGenrePage("smoke-rock");
    check(rockPage?.children.map((c) => c.slug).join(",") === "smoke-shoegaze" && rockPage.families.join(",") === "rock", "página de smoke-rock: su subgénero y su familia");
    check((await getGenrePage("smoke-shoegaze"))?.parents.map((g) => g.slug).join(",") === "smoke-rock", "página de smoke-shoegaze: su padre");
    check((await getGenrePage("smoke-rock"))?.artists.some((a) => a.id === band.id) === true, "el artista aparece en el género padre vía su subgénero");
    check((await getGenrePage("smoke-hidden")) === null && (await getGenrePage("instrumental")) === null && (await getGenrePage("no-existe")) === null, "oculto, descriptor e inexistente no tienen página");
    check((await searchGenres("SMOKE shoe")).map((g) => g.slug).includes("smoke-shoegaze"), "la búsqueda ignora mayúsculas");
    check((await searchGenres("psicodelico")).some((g) => g.slug === "psychedelic-rock"), "la búsqueda ignora tildes y encuentra por el nombre en español");
    check(!(await searchGenres("instrumental")).some((g) => g.slug === "instrumental") && !(await searchGenres("smoke-hidden")).length, "descriptores y ocultos no salen en la búsqueda");
    check((await searchGenres("")).length === 12, "sin texto: 12 sugerencias");

    console.log("6c) Identidad musical validada contra la taxonomía");
    const stamp = Date.now().toString(36);
    const user = await registerUser({ username: `smoke_gen_${stamp}`, email: `smoke-gen-${stamp}@example.test`, password: "smoke-password-123" });
    if (!user) throw new Error("no se creó el usuario");
    userIds.push(user.id);
    const saved = await updateMusicIdentity(user.id, { genres: ["smoke-shoegaze", "cumbia-villera"] });
    check(saved.genres.join(",") === "smoke-shoegaze,cumbia-villera", "acepta un género fuera de las 22 sugerencias");
    const code = async (promise: Promise<unknown>) => promise.then(() => null, (error: { code?: string }) => error.code ?? "OTRO");
    check((await code(updateMusicIdentity(user.id, { genres: ["smoke-rock", "no-existe"] }))) === "VALIDATION_ERROR", "rechaza un slug inexistente");
    check((await code(updateMusicIdentity(user.id, { genres: ["instrumental"] }))) === "VALIDATION_ERROR", "rechaza un descriptor");
    check((await code(updateMusicIdentity(user.id, { genres: ["smoke-hidden"] }))) === "VALIDATION_ERROR", "rechaza un género oculto");
    const [stored] = await db.select({ genres: schema.appUser.genres }).from(schema.appUser).where(eq(schema.appUser.id, user.id));
    check(stored?.genres.join(",") === "smoke-shoegaze,cumbia-villera", "los rechazos no cambian lo guardado");
    const labels = await identityGenreLabels(["smoke-shoegaze", "smoke-hidden", "no-existe"], "es");
    check(Object.keys(labels).join(",") === "smoke-shoegaze", "las etiquetas ignoran ocultos e inexistentes");

    console.log("6d) Votos de la comunidad sobre los géneros del álbum (add-genre-votes)");
    const { castGenreVote, removeGenreVote, getAlbumGenreVotes, MAX_VOTES_PER_ALBUM } = await import("../src/services/genres/votes");
    const voters = [user];
    for (let i = 1; i < 5; i++) {
      const v = await registerUser({ username: `smoke_gen_${stamp}_${i}`, email: `smoke-gen-${stamp}-${i}@example.test`, password: "smoke-password-123" });
      if (!v) throw new Error("no se creó el votante");
      userIds.push(v.id);
      voters.push(v);
    }
    const rate = (userId: string, releaseGroupId: string) =>
      db.insert(schema.rating).values({ userId, releaseGroupId, stars: "4" });
    const clearVotes = () => db.delete(schema.releaseGroupGenreVote).where(inArray(schema.releaseGroupGenreVote.releaseGroupId, [linked.id, unlinked.id]));
    const slugs = async (releaseGroupId: string) => (await effective(releaseGroupId)).map((g) => `${g.slug}${g.inherited ? "*" : ""}`);

    check((await code(castGenreVote(user.id, unlinked.id, "smoke-folk", 1))) === "GENRE_VOTE_NO_INTERACTION", "sin valoración, diario ni colección no se puede votar");
    await rate(user.id, unlinked.id);
    check((await code(castGenreVote(user.id, unlinked.id, "instrumental", 1))) === "VALIDATION_ERROR", "un descriptor no se vota");
    check((await code(castGenreVote(user.id, unlinked.id, "smoke-hidden", 1))) === "VALIDATION_ERROR", "un género oculto no se vota");
    check((await code(castGenreVote(user.id, unlinked.id, "no-existe", 1))) === "GENRE_NOT_FOUND", "un género inexistente da GENRE_NOT_FOUND");
    check((await code(castGenreVote(user.id, "00000000-0000-4000-8000-00000000dead", "smoke-folk", 1))) === "ALBUM_NOT_FOUND", "un álbum inexistente da ALBUM_NOT_FOUND");

    // Una propuesta desplaza la herencia: el álbum deja de heredar del artista.
    await castGenreVote(user.id, unlinked.id, "smoke-folk", 1);
    check((await slugs(unlinked.id)).join(",") === "smoke-folk", `una propuesta reemplaza la herencia (${(await slugs(unlinked.id)).join(", ")})`);
    await removeGenreVote(user.id, unlinked.id, "smoke-folk");
    check((await slugs(unlinked.id)).join(",") === "smoke-shoegaze*,smoke-trap*,smoke-trap-latino*", "sin votos el álbum vuelve a heredar");

    // Puntaje, principal y secundarios.
    for (const v of voters.slice(0, 3)) await rate(v.id, unlinked.id).catch(() => undefined);
    await castGenreVote(voters[0]!.id, unlinked.id, "smoke-folk", 1);
    await castGenreVote(voters[1]!.id, unlinked.id, "smoke-folk", 1);
    await castGenreVote(voters[2]!.id, unlinked.id, "smoke-shoegaze", 1);
    const ranked = await getAlbumGenres(unlinked.id);
    check(ranked.genres.map((g) => `${g.slug}:${g.rank}`).join(",") === "smoke-folk:primary,smoke-shoegaze:secondary", `principal por puntaje y secundario al llegar a la mitad (${ranked.genres.map((g) => `${g.slug}:${g.rank}`).join(",")})`);
    check(!ranked.genres.some((g) => g.inherited), "con géneros votados no hay herencia");

    // Las cifras solo salen con 5 votantes distintos; el voto ajeno nunca se expone.
    const fewVoters = await getAlbumGenreVotes(unlinked.id, voters[0]!.id);
    check(!fewVoters.showCounts && fewVoters.genres.every((g) => g.up === null && g.down === null), "con 3 votantes no hay cifras");
    check(fewVoters.genres.find((g) => g.slug === "smoke-folk")?.mine === 1 && fewVoters.genres.find((g) => g.slug === "smoke-shoegaze")?.mine === null, "cada persona ve solo su propio voto");
    await rate(voters[3]!.id, unlinked.id).catch(() => undefined);
    await rate(voters[4]!.id, unlinked.id).catch(() => undefined);
    await castGenreVote(voters[3]!.id, unlinked.id, "smoke-folk", -1);
    await castGenreVote(voters[4]!.id, unlinked.id, "smoke-shoegaze", 1);
    const manyVoters = await getAlbumGenreVotes(unlinked.id, null);
    const folkVotes = manyVoters.genres.find((g) => g.slug === "smoke-folk");
    check(manyVoters.showCounts && folkVotes?.up === 2 && folkVotes.down === 1 && folkVotes.mine === null, "con 5 votantes salen las cifras (2 a favor, 1 en contra) y un visitante no tiene voto propio");

    // Una cuenta desactivada deja de contar y vuelve al reactivarla.
    await db.update(schema.appUser).set({ deactivatedAt: new Date() }).where(eq(schema.appUser.id, voters[3]!.id));
    const withoutOne = (await getAlbumGenreVotes(unlinked.id, null)).genres.find((g) => g.slug === "smoke-folk");
    check(withoutOne?.score === 2, `un votante desactivado no cuenta (puntaje ${withoutOne?.score})`);
    await db.update(schema.appUser).set({ deactivatedAt: null }).where(eq(schema.appUser.id, voters[3]!.id));
    check((await getAlbumGenreVotes(unlinked.id, null)).genres.find((g) => g.slug === "smoke-folk")?.score === 1, "al reactivar la cuenta su voto vuelve a contar");

    // El voto sobrevive a quitar la interacción.
    await db.delete(schema.rating).where(and(eq(schema.rating.userId, voters[0]!.id), eq(schema.rating.releaseGroupId, unlinked.id)));
    check((await getAlbumGenreVotes(unlinked.id, null)).genres.find((g) => g.slug === "smoke-folk")?.score === 1, "el voto sobrevive a quitar la valoración");
    await clearVotes();

    // La semilla de Wikidata vale 1: un −1 la neutraliza (1 − 1 = 0) y el álbum vuelve a heredar; un segundo −1 la deja en −1.
    for (const v of voters.slice(0, 2)) await rate(v.id, linked.id);
    await castGenreVote(voters[0]!.id, linked.id, "smoke-trap-latino", -1);
    const neutralized = await slugs(linked.id);
    check(neutralized.length === 3 && neutralized.every((g) => g.endsWith("*")), `un −1 neutraliza la semilla y el álbum hereda (${neutralized.join(", ")})`);
    await castGenreVote(voters[1]!.id, linked.id, "smoke-trap-latino", -1);
    const corrected = await slugs(linked.id);
    check(corrected.length === 3 && corrected.every((g) => g.endsWith("*")), `con dos −1 la semilla sigue fuera (${corrected.join(", ")})`);
    await clearVotes();
    check((await slugs(linked.id)).join(",") === "smoke-trap-latino", "retirados los votos la semilla vuelve");

    // Tope de 8 géneros por persona y álbum.
    const styleSlugs = (
      await db
        .select({ slug: schema.genre.slug })
        .from(schema.genre)
        .where(and(eq(schema.genre.kind, "style"), sql`${schema.genre.mbid}::text NOT LIKE ${`${SMOKE_PREFIX}%`}`))
        .limit(MAX_VOTES_PER_ALBUM + 1)
    ).map((g) => g.slug);
    for (const slug of styleSlugs.slice(0, MAX_VOTES_PER_ALBUM)) await castGenreVote(voters[2]!.id, unlinked.id, slug, 1);
    check((await code(castGenreVote(voters[2]!.id, unlinked.id, styleSlugs[MAX_VOTES_PER_ALBUM]!, 1))) === "VALIDATION_ERROR", `el voto ${MAX_VOTES_PER_ALBUM + 1} se rechaza`);
    check((await code(castGenreVote(voters[2]!.id, unlinked.id, styleSlugs[0]!, -1))) === null, "cambiar un voto existente con el tope lleno sí se puede");
    await clearVotes();

    // Una suspensión social bloquea votar.
    await db.insert(schema.userRestriction).values({ userId: voters[2]!.id, scope: "social_activity", reason: "smoke" });
    check((await code(castGenreVote(voters[2]!.id, unlinked.id, "smoke-folk", 1))) === "SOCIAL_SUSPENSION_ACTIVE", "con una suspensión social vigente no se puede votar");
    check((await getAlbumGenreVotes(unlinked.id, voters[2]!.id)).access.canVote === false, "el panel informa que no puede votar");

    // Explorar y la vista usan el puntaje: una propuesta lleva el álbum a la familia/género votado.
    await db.delete(schema.userRestriction).where(eq(schema.userRestriction.userId, voters[2]!.id));
    await castGenreVote(voters[1]!.id, unlinked.id, "smoke-folk", 1);
    const folkAfterVote = await allPages((p) => listAlbumsByGenre("smoke-folk", p));
    check(smokeIds(folkAfterVote).includes(unlinked.id), "Explorar por género encuentra el álbum por el voto de la comunidad");
    await clearVotes();

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
