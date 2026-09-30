import { describe, expect, it } from "vitest";
import {
  albumHref,
  artistHref,
  artistSegment,
  listHref,
  localeHref,
  reviewHref,
  songHref,
} from "./catalog-links";
import { encodeId } from "./slug";

const ARTIST_ID = "93f1f6be-b1dc-42d0-abde-2850072d0774";
const ALBUM_ID = "9504e7c5-da1f-475d-bcce-a64f6013772f";
const SONG_ID = "0f1e2d3c-4b5a-6978-8796-a5b4c3d2e1f0";
const REVIEW_ID = "a1b2c3d4-0000-4000-8000-000000000abc";
const LIST_ID = "b2c3d4e5-0000-4000-8000-000000000def";

describe("helpers de enlace", () => {
  it("artista: segmento canónico", () => {
    expect(artistHref("Pink Floyd", ARTIST_ID)).toBe(`/artist/pink-floyd-${encodeId(ARTIST_ID)}`);
    expect(artistSegment("Pink Floyd", ARTIST_ID)).toBe(`pink-floyd-${encodeId(ARTIST_ID)}`);
  });

  it("álbum: artista principal y título", () => {
    expect(albumHref("Pink Floyd", "The Wall", ALBUM_ID)).toBe(
      `/album/pink-floyd-the-wall-${encodeId(ALBUM_ID)}`,
    );
  });

  it("canción: artista principal y título", () => {
    expect(songHref("Pink Floyd", "Comfortably Numb", SONG_ID)).toBe(
      `/song/pink-floyd-comfortably-numb-${encodeId(SONG_ID)}`,
    );
  });

  it("artista desconocido (`null`) produce slug solo de título", () => {
    expect(albumHref(null, "Greatest Hits", ALBUM_ID)).toBe(
      `/album/greatest-hits-${encodeId(ALBUM_ID)}`,
    );
    expect(songHref(null, "Intro", SONG_ID)).toBe(`/song/intro-${encodeId(SONG_ID)}`);
  });

  it("colaboración: el slug lleva solo el artista principal recibido", () => {
    // El llamador pasa únicamente el primer crédito `primary`; los `featured` no llegan.
    expect(albumHref("Artista A", "Juntos", ALBUM_ID)).toBe(
      `/album/artista-a-juntos-${encodeId(ALBUM_ID)}`,
    );
  });

  it("título muy largo: corta en el último límite de palabra", () => {
    const title = `${"palabra ".repeat(12)}final`;
    const href = albumHref("A", title, ALBUM_ID);
    const slug = href.slice("/album/".length, href.length - encodeId(ALBUM_ID).length - 1);
    expect([...slug].length).toBeLessThanOrEqual(30 + 1 + 60);
    expect(slug.startsWith("a-palabra-palabra")).toBe(true);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("nombre solo de símbolos: el segmento es solo el id", () => {
    expect(albumHref(null, "♪♫", ALBUM_ID)).toBe(`/album/${encodeId(ALBUM_ID)}`);
  });

  it("lista: usuario y nombre", () => {
    expect(listHref("ana", "Mis favoritos", LIST_ID)).toBe(
      `/users/ana/lists/mis-favoritos-${encodeId(LIST_ID)}`,
    );
  });

  it("lista: codifica el usuario", () => {
    expect(listHref("ana maría", "Top", LIST_ID)).toBe(
      `/users/ana%20mar%C3%ADa/lists/top-${encodeId(LIST_ID)}`,
    );
  });

  it("reseña: usuario y título del álbum", () => {
    expect(reviewHref("ana", "The Wall", REVIEW_ID)).toBe(
      `/review/ana-the-wall-${encodeId(REVIEW_ID)}`,
    );
  });

  it("reseña: autor desactivado (usuario vacío) deja solo el álbum", () => {
    expect(reviewHref("", "The Wall", REVIEW_ID)).toBe(
      `/review/the-wall-${encodeId(REVIEW_ID)}`,
    );
  });

  it("localeHref antepone el locale", () => {
    expect(localeHref("es", "/album/x")).toBe("/es/album/x");
  });
});
