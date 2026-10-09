import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtistRow, RecordingRow } from "@/db/schema";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("./activity", () => ({ activityScores: vi.fn(async () => new Map()) }));
vi.mock("./local-match", () => ({
  matchLocalRecordings: vi.fn(async () => []),
  findArtistsByKeys: vi.fn(async () => []),
  recordingsByArtistsAndTitlePrefix: vi.fn(async () => []),
  recordingSignals: vi.fn(),
  shortPrefixRecordings: vi.fn(async () => []),
}));

const localMatch = await import("./local-match");
const { activityScores } = await import("./activity");
const { songSuggestions, coveredWords } = await import("./song-suggestions");

function rec(id: string, title: string): RecordingRow {
  return { id, mbid: null, title, durationSec: null } as RecordingRow;
}

interface Fixture {
  artist: string;
  albums?: number;
  activity?: number;
  followers?: number;
  explored?: boolean;
}

/** Señales de la base para cada grabación: artista principal, álbumes y seguidores. */
function signals(fixtures: Record<string, Fixture>) {
  vi.mocked(localMatch.recordingSignals).mockResolvedValue({
    artistByRecording: new Map(
      Object.entries(fixtures).map(([id, f]) => [id, { id: `artist-${f.artist}`, name: f.artist, explored: f.explored ?? false }]),
    ),
    albumsByRecording: new Map(
      Object.entries(fixtures)
        .filter(([, f]) => f.albums)
        .map(([id, f]) => [id, f.albums!]),
    ),
    followersByArtist: new Map(
      Object.values(fixtures)
        .filter((f) => f.followers)
        .map((f) => [`artist-${f.artist}`, f.followers!]),
    ),
  });
  vi.mocked(activityScores).mockResolvedValue(
    new Map(
      Object.entries(fixtures)
        .filter(([, f]) => f.activity)
        .map(([id, f]) => [id, f.activity!]),
    ),
  );
}

const labels = (rows: { title: string; artistName: string | null }[]) => rows.map((row) => `${row.title} — ${row.artistName}`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([]);
  vi.mocked(localMatch.findArtistsByKeys).mockResolvedValue([]);
  vi.mocked(localMatch.recordingsByArtistsAndTitlePrefix).mockResolvedValue([]);
  vi.mocked(localMatch.shortPrefixRecordings).mockResolvedValue([]);
  vi.mocked(activityScores).mockResolvedValue(new Map());
});

describe("songSuggestions", () => {
  it("agrupa las versiones de una canción y la representa con la de más álbumes", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([
      rec("quartet", "One"),
      rec("one-a", "One"),
      rec("one-live", "One (live)"),
      rec("one-b", "One"),
    ]);
    signals({
      quartet: { artist: "Midnite String Quartet", albums: 1 },
      "one-a": { artist: "Metallica", albums: 1 },
      "one-live": { artist: "Metallica" },
      "one-b": { artist: "Metallica", albums: 3 },
    });

    const rows = await songSuggestions("one", 6);

    expect(rows).toEqual([
      { id: "one-b", title: "One", artistName: "Metallica" },
      { id: "quartet", title: "One", artistName: "Midnite String Quartet" },
    ]);
  });

  it("puente artista + canción: «metallica one» sugiere primero la canción de Metallica", async () => {
    vi.mocked(localMatch.findArtistsByKeys).mockResolvedValue([{ id: "artist-Metallica", name: "Metallica" } as ArtistRow]);
    vi.mocked(localMatch.recordingsByArtistsAndTitlePrefix).mockResolvedValue([rec("one", "One")]);
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([rec("string", "String Metallica"), rec("metall", "Metall")]);
    signals({
      one: { artist: "Metallica", albums: 3 },
      string: { artist: "Musical Artizan", albums: 9, activity: 4 },
      metall: { artist: "CHBB", albums: 1 },
    });

    const rows = await songSuggestions("metallica one", 6);

    expect(localMatch.recordingsByArtistsAndTitlePrefix).toHaveBeenCalledWith(["artist-Metallica"], "one", 40);
    expect(labels(rows)[0]).toBe("One — Metallica");
  });

  it("entre las difusas, primero las que cubren más palabras de la consulta", async () => {
    vi.mocked(localMatch.findArtistsByKeys).mockResolvedValue([{ id: "artist-Oasis", name: "Oasis" } as ArtistRow]);
    vi.mocked(localMatch.recordingsByArtistsAndTitlePrefix).mockResolvedValue([rec("oasis", "Wonderwall")]);
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([rec("why", "I Wonder Why"), rec("metome", "Wonderwall")]);
    signals({
      oasis: { artist: "Oasis" },
      why: { artist: "Fleetwood Mac", albums: 4 },
      metome: { artist: "Metome" },
    });

    expect(labels(await songSuggestions("oasis wonderw", 6))).toEqual([
      "Wonderwall — Oasis",
      "Wonderwall — Metome",
      "I Wonder Why — Fleetwood Mac",
    ]);
  });

  it("a igual coincidencia, la actividad pesa más que los álbumes", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([rec("sabbath", "Paranoid"), rec("preston", "Paranoid")]);
    signals({
      sabbath: { artist: "Black Sabbath", albums: 5 },
      preston: { artist: "Ryan Preston", albums: 1, activity: 2 },
    });

    expect(labels(await songSuggestions("paranoid", 6))).toEqual(["Paranoid — Ryan Preston", "Paranoid — Black Sabbath"]);
  });

  it("una grabación sin álbumes va detrás; luego seguidores y artista explorado", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([
      rec("stub", "Wonderwall"),
      rec("explored", "Wonderwall"),
      rec("followed", "Wonderwall"),
      rec("plain", "Wonderwall"),
    ]);
    signals({
      stub: { artist: "Metome" },
      explored: { artist: "Allred", albums: 1, explored: true },
      followed: { artist: "Superpowerless", albums: 1, followers: 3 },
      plain: { artist: "EEPROM", albums: 1 },
    });

    expect(labels(await songSuggestions("wonderwall", 6))).toEqual([
      "Wonderwall — Superpowerless",
      "Wonderwall — Allred",
      "Wonderwall — EEPROM",
      "Wonderwall — Metome",
    ]);
  });

  it("las coincidencias difusas solo rellenan detrás de las que cubren la consulta", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([rec("distaste", "Distaste"), rec("taste", "Taste")]);
    signals({
      distaste: { artist: "Banda", albums: 20, activity: 9 },
      taste: { artist: "Sabrina Carpenter", albums: 1 },
    });

    expect(labels(await songSuggestions("taste", 6))).toEqual(["Taste — Sabrina Carpenter", "Distaste — Banda"]);
  });

  it("con una errata sin coincidencias que cubran, muestra igualmente las difusas", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([rec("queen", "Bohemian Rhapsody")]);
    signals({ queen: { artist: "Queen", albums: 30 } });

    expect(labels(await songSuggestions("bohemian rapsody", 6))).toEqual(["Bohemian Rhapsody — Queen"]);
  });

  it("sin puente con un resto de una letra, y el pool según la longitud de la consulta", async () => {
    vi.mocked(localMatch.findArtistsByKeys).mockResolvedValue([{ id: "artist-Metallica", name: "Metallica" } as ArtistRow]);

    await songSuggestions("metallica o", 6);
    expect(localMatch.recordingsByArtistsAndTitlePrefix).not.toHaveBeenCalled();
    expect(localMatch.matchLocalRecordings).toHaveBeenLastCalledWith("metallica o", 80, 80);

    vi.mocked(localMatch.matchLocalRecordings).mockClear();
    await songSuggestions("on", 6);
    // Con 2 letras, inicio de palabra sobre `search_text` (openspec: speed-up-short-suggestions).
    expect(localMatch.shortPrefixRecordings).toHaveBeenLastCalledWith("on", 40);
    expect(localMatch.matchLocalRecordings).not.toHaveBeenCalled();
    expect(localMatch.recordingSignals).not.toHaveBeenCalled();
  });

  it("con 2 letras, palabra completa y prefijo cuentan igual: deciden los álbumes", async () => {
    vi.mocked(localMatch.shortPrefixRecordings).mockResolvedValue([rec("floor", "On the Floor"), rec("one", "One")]);
    signals({
      floor: { artist: "Jennifer Lopez", albums: 1 },
      one: { artist: "Metallica", albums: 3 },
    });

    expect(labels(await songSuggestions("on", 6))).toEqual(["One — Metallica", "On the Floor — Jennifer Lopez"]);
  });

  it("con 3+ letras, la palabra completa sigue por delante del prefijo", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue([rec("one", "Onerous"), rec("floor", "One Floor")]);
    signals({
      one: { artist: "Banda", albums: 9 },
      floor: { artist: "Otra", albums: 1 },
    });

    expect(labels(await songSuggestions("one", 6))).toEqual(["One Floor — Otra", "Onerous — Banda"]);
  });

  it("recorta al límite", async () => {
    vi.mocked(localMatch.matchLocalRecordings).mockResolvedValue(
      Array.from({ length: 8 }, (_, index) => rec(`love-${index}`, "Love")),
    );
    signals(Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`love-${index}`, { artist: `Artista ${index}` }])));

    expect(await songSuggestions("love", 6)).toHaveLength(6);
  });
});

describe("coveredWords", () => {
  it("cuenta palabras de título y artista, la última como prefijo, sin acentos", () => {
    expect(coveredWords("metallica one", "One", "Metallica")).toEqual({ covered: 2, total: 2 });
    expect(coveredWords("Metállica on", "One", "Metallica")).toEqual({ covered: 2, total: 2 });
    expect(coveredWords("metallica one", "String Metallica", "Musical Artizan")).toEqual({ covered: 1, total: 2 });
    expect(coveredWords("on metallica", "One", "Metallica")).toEqual({ covered: 1, total: 2 });
  });
});
