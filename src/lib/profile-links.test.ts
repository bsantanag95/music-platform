import { describe, expect, it } from "vitest";
import { PROFILE_LINK_KINDS } from "@/services/social/types";
import {
  describeStoredLink,
  displayUrl,
  editableValue,
  hostOf,
  isHandleLinkKind,
  normalizeLinkInput,
  normalizeWebUrl,
  WEB_LINK_KINDS,
} from "./profile-links";

const ok = (kind: Parameters<typeof normalizeLinkInput>[0], raw: string) => {
  const result = normalizeLinkInput(kind, raw);
  expect(result.ok, `${kind} ← ${JSON.stringify(raw)}`).toBe(true);
  return result.ok ? result : { url: "", handle: null };
};
const reason = (kind: Parameters<typeof normalizeLinkInput>[0], raw: string) => {
  const result = normalizeLinkInput(kind, raw);
  expect(result.ok, `${kind} ← ${JSON.stringify(raw)}`).toBe(false);
  return result.ok ? null : result.reason;
};

describe("clasificación de tipos", () => {
  it("todos los tipos son por usuario salvo Enlace", () => {
    for (const kind of PROFILE_LINK_KINDS) {
      expect(isHandleLinkKind(kind)).toBe(!(WEB_LINK_KINDS as readonly string[]).includes(kind));
    }
    expect(PROFILE_LINK_KINDS).toEqual(expect.arrayContaining(["x", "tiktok", "spotify"]));
  });
});

describe("tipos por usuario — entrada de usuario", () => {
  it.each([
    ["instagram", "ana", "https://www.instagram.com/ana"],
    ["instagram", "@ana", "https://www.instagram.com/ana"],
    ["instagram", "  @ana  ", "https://www.instagram.com/ana"],
    ["instagram", "ana.perez", "https://www.instagram.com/ana.perez"],
    ["x", "@ana_99", "https://x.com/ana_99"],
    ["tiktok", "@ana.perez", "https://www.tiktok.com/@ana.perez"],
    ["tiktok", "ana", "https://www.tiktok.com/@ana"],
    ["youtube", "@mi-canal", "https://www.youtube.com/@mi-canal"],
    ["soundcloud", "mi_banda", "https://soundcloud.com/mi_banda"],
    ["bandcamp", "mibanda", "https://mibanda.bandcamp.com"],
    ["bandcamp", "MiBanda", "https://mibanda.bandcamp.com"],
    ["lastfm", "ana_fm", "https://www.last.fm/user/ana_fm"],
    ["discogs", "ana-vinyl", "https://www.discogs.com/user/ana-vinyl"],
    ["spotify", "31abcd", "https://open.spotify.com/user/31abcd"],
  ] as const)("%s ← %s", (kind, raw, expectedUrl) => {
    expect(ok(kind, raw).url).toBe(expectedUrl);
  });

  it("devuelve el usuario extraído, sin el @", () => {
    expect(ok("instagram", "@ana")).toMatchObject({ handle: "ana" });
    expect(ok("bandcamp", "MiBanda")).toMatchObject({ handle: "mibanda" });
  });

  it("un usuario con punto no se confunde con un dominio", () => {
    expect(ok("instagram", "ana.perez").url).toBe("https://www.instagram.com/ana.perez");
    expect(ok("tiktok", "dj.es").url).toBe("https://www.tiktok.com/@dj.es");
  });

  it("un valor vacío o de solo espacios es 'empty'", () => {
    expect(reason("instagram", "")).toBe("empty");
    expect(reason("other", "   ")).toBe("empty");
  });

  it.each([
    ["instagram", "ana perez"],
    ["instagram", "a".repeat(31)],
    ["instagram", "ana!"],
    ["instagram", "@@ana"],
    ["x", "a".repeat(16)],
    ["x", "ana.perez"],
    ["tiktok", "a"],
    ["youtube", "ab"],
    ["soundcloud", "ab"],
    ["bandcamp", "-mibanda"],
    ["lastfm", "1ana"],
    ["lastfm", "a"],
  ] as const)("usuario inválido: %s ← %s", (kind, raw) => {
    expect(reason(kind, raw)).toBe("invalid_handle");
  });

  it("una dirección de otro sitio escrita como usuario es 'wrong_site'", () => {
    expect(reason("instagram", "facebook.com")).toBe("wrong_site");
    expect(reason("bandcamp", "mibanda.com")).toBe("wrong_site");
    expect(reason("x", "ana.org")).toBe("wrong_site");
  });
});

describe("tipos por usuario — enlace pegado", () => {
  it.each([
    ["instagram", "https://instagram.com/ana", "https://www.instagram.com/ana"],
    ["instagram", "https://www.instagram.com/ana/", "https://www.instagram.com/ana"],
    ["instagram", "https://www.instagram.com/ana?igsh=abc123", "https://www.instagram.com/ana"],
    ["instagram", "http://instagram.com/ana#x", "https://www.instagram.com/ana"],
    ["instagram", "instagram.com/ana", "https://www.instagram.com/ana"],
    ["instagram", "https://instagr.am/ana", "https://www.instagram.com/ana"],
    ["instagram", "https://m.instagram.com/ana", "https://www.instagram.com/ana"],
    ["x", "https://x.com/ana", "https://x.com/ana"],
    ["x", "https://twitter.com/ana", "https://x.com/ana"],
    ["x", "https://mobile.twitter.com/ana?lang=es", "https://x.com/ana"],
    ["tiktok", "https://www.tiktok.com/@ana", "https://www.tiktok.com/@ana"],
    ["tiktok", "tiktok.com/@ana?lang=es", "https://www.tiktok.com/@ana"],
    ["youtube", "https://www.youtube.com/@mi-canal", "https://www.youtube.com/@mi-canal"],
    ["youtube", "https://m.youtube.com/@mi-canal/videos", "https://www.youtube.com/@mi-canal"],
    ["soundcloud", "https://soundcloud.com/mi_banda/tracks", "https://soundcloud.com/mi_banda"],
    ["bandcamp", "https://mibanda.bandcamp.com", "https://mibanda.bandcamp.com"],
    ["bandcamp", "https://mibanda.bandcamp.com/album/algo", "https://mibanda.bandcamp.com"],
    ["bandcamp", "mibanda.bandcamp.com", "https://mibanda.bandcamp.com"],
    ["lastfm", "https://www.last.fm/user/ana_fm", "https://www.last.fm/user/ana_fm"],
    ["lastfm", "https://www.last.fm/es/user/ana_fm", "https://www.last.fm/user/ana_fm"],
    ["discogs", "https://www.discogs.com/user/ana-vinyl", "https://www.discogs.com/user/ana-vinyl"],
    ["discogs", "https://www.discogs.com/es/user/ana-vinyl/collection", "https://www.discogs.com/user/ana-vinyl"],
    ["spotify", "https://open.spotify.com/user/31abcd?si=xyz", "https://open.spotify.com/user/31abcd"],
    ["spotify", "https://open.spotify.com/intl-es/user/31abcd", "https://open.spotify.com/user/31abcd"],
  ] as const)("%s ← %s", (kind, raw, expectedUrl) => {
    expect(ok(kind, raw).url).toBe(expectedUrl);
  });

  it("un enlace de otro sitio es 'wrong_site'", () => {
    expect(reason("instagram", "https://tiktok.com/@ana")).toBe("wrong_site");
    expect(reason("x", "https://instagram.com/ana")).toBe("wrong_site");
    expect(reason("bandcamp", "https://ana.example.com")).toBe("wrong_site");
    expect(reason("spotify", "https://www.last.fm/user/ana")).toBe("wrong_site");
  });

  it("un dominio que solo termina parecido no cuenta como del sitio", () => {
    expect(reason("instagram", "https://notinstagram.com/ana")).toBe("wrong_site");
    expect(reason("instagram", "https://instagram.com.evil.example/ana")).toBe("wrong_site");
    expect(reason("bandcamp", "https://bandcamp.com.evil.example")).toBe("wrong_site");
  });

  it.each([
    ["instagram", "instagram.com"],
    ["instagram", "https://instagram.com"],
    ["instagram", "https://www.instagram.com/"],
    ["instagram", "https://www.instagram.com/p/Cabc123/"],
    ["instagram", "https://www.instagram.com/explore/"],
    ["x", "https://x.com/home"],
    ["x", "https://twitter.com/"],
    ["tiktok", "https://www.tiktok.com/"],
    ["tiktok", "https://www.tiktok.com/discover"],
    ["youtube", "https://www.youtube.com/"],
    ["soundcloud", "https://soundcloud.com/discover"],
    ["bandcamp", "https://bandcamp.com"],
    ["bandcamp", "https://daily.bandcamp.com"],
    ["lastfm", "https://www.last.fm/"],
    ["lastfm", "https://www.last.fm/music/Radiohead"],
    ["discogs", "https://www.discogs.com/artist/1234-Radiohead"],
    ["spotify", "https://open.spotify.com/artist/abc"],
  ] as const)("sin usuario: %s ← %s", (kind, raw) => {
    expect(reason(kind, raw)).toBe("missing_handle");
  });

  it("YouTube: los formatos de canal sin @handle piden el usuario", () => {
    expect(reason("youtube", "https://www.youtube.com/channel/UC1234567890")).toBe("youtube_format");
    expect(reason("youtube", "https://www.youtube.com/c/MiCanal")).toBe("youtube_format");
    expect(reason("youtube", "https://www.youtube.com/user/mi_canal")).toBe("youtube_format");
  });

  it("un esquema no web es 'unsafe_scheme'", () => {
    expect(reason("instagram", "javascript://instagram.com/ana")).toBe("unsafe_scheme");
    expect(reason("instagram", "ftp://instagram.com/ana")).toBe("unsafe_scheme");
  });

  it("un usuario extraído que no cumple las reglas del sitio es 'invalid_handle'", () => {
    expect(reason("x", "https://x.com/" + "a".repeat(20))).toBe("invalid_handle");
    expect(reason("tiktok", "https://www.tiktok.com/@a")).toBe("invalid_handle");
  });

  it("decodifica el usuario de la ruta y rechaza lo que no valide", () => {
    expect(ok("instagram", "https://instagram.com/ana%2Eperez").url).toBe("https://www.instagram.com/ana.perez");
    expect(reason("instagram", "https://instagram.com/%E0%A4%A")).toBe("invalid_handle");
  });
});

describe("enlace (dirección web)", () => {
  it.each([
    ["www.link.com", "https://www.link.com"],
    ["link.com", "https://link.com"],
    ["link.com/mi-pagina", "https://link.com/mi-pagina"],
    ["https://link.com", "https://link.com"],
    ["http://viejo.example", "http://viejo.example"],
    ["HTTPS://Link.com/Ruta", "HTTPS://Link.com/Ruta"],
    ["  mi.sitio.cl  ", "https://mi.sitio.cl"],
    ["//link.com/x", "https://link.com/x"],
    ["link.com:8080/x", "https://link.com:8080/x"],
    ["link.com?a=1&b=2", "https://link.com?a=1&b=2"],
    ["https://www.link.com/", "https://www.link.com/"],
    ["ejemplo.co.uk", "https://ejemplo.co.uk"],
    ["xn--espaa-rta.example", "https://xn--espaa-rta.example"],
  ])("acepta %s", (raw, expected) => {
    const result = normalizeWebUrl(raw);
    expect(result).toEqual({ ok: true, url: expected, handle: null });
  });

  it("el tipo Enlace normaliza igual que la función web", () => {
    expect(ok("other", "www.link.com").url).toBe("https://www.link.com");
  });

  it("Sitio web ya no es un tipo: se unificó en Enlace", () => {
    expect(PROFILE_LINK_KINDS).not.toContain("website");
    expect(PROFILE_LINK_KINDS).toContain("other");
    expect(WEB_LINK_KINDS).toEqual(["other"]);
  });

  it("no añade barra final ni cambia el resto del texto", () => {
    expect(ok("other", "link.com").url).toBe("https://link.com");
  });

  it.each([
    ["javascript:alert(1)"],
    ["JavaScript:alert(1)"],
    ["mailto:ana@example.com"],
    ["ftp://files.example.com"],
    ["data:text/html,<b>x</b>"],
    ["file:///etc/passwd"],
    ["tel:+56912345678"],
  ])("rechaza el esquema no web %s", (raw) => {
    expect(normalizeWebUrl(raw)).toEqual({ ok: false, reason: "unsafe_scheme" });
  });

  it.each([["hola"], ["localhost"], ["localhost:3000"], ["a"], ["http://"], ["https://ejemplo"], ["."], ["-.com"]])(
    "rechaza un valor sin dominio válido: %s",
    (raw) => {
      expect(normalizeWebUrl(raw)).toEqual({ ok: false, reason: "invalid_url" });
    },
  );

  it("rechaza espacios, credenciales embebidas y vacíos", () => {
    expect(normalizeWebUrl("mi sitio.com")).toEqual({ ok: false, reason: "invalid_url" });
    expect(normalizeWebUrl("https://ana:clave@link.com")).toEqual({ ok: false, reason: "invalid_url" });
    expect(normalizeWebUrl("")).toEqual({ ok: false, reason: "empty" });
  });

  it("host:puerto no se confunde con un esquema", () => {
    expect(normalizeWebUrl("ejemplo.com:8080")).toEqual({ ok: true, url: "https://ejemplo.com:8080", handle: null });
  });
});

describe("describeStoredLink / editableValue", () => {
  it("un enlace guardado coherente devuelve el usuario y el detalle", () => {
    expect(describeStoredLink("instagram", "https://www.instagram.com/ana")).toEqual({
      consistent: true,
      handle: "ana",
      detail: "@ana",
    });
    expect(describeStoredLink("lastfm", "https://www.last.fm/user/ana_fm")).toEqual({
      consistent: true,
      handle: "ana_fm",
      detail: "ana_fm",
    });
  });

  it("un Instagram que apunta a la portada no es coherente y conserva el dominio", () => {
    expect(describeStoredLink("instagram", "http://instagram.com")).toEqual({
      consistent: false,
      handle: null,
      detail: "instagram.com",
    });
  });

  it("un tipo por usuario que apunta a otro sitio no es coherente", () => {
    expect(describeStoredLink("instagram", "https://www.aaa.com/x")).toMatchObject({
      consistent: false,
      detail: "aaa.com",
    });
  });

  it("un enlace muestra el dominio sin www", () => {
    expect(describeStoredLink("other", "https://www.link.com/ruta")).toEqual({
      consistent: true,
      handle: null,
      detail: "link.com",
    });
    expect(describeStoredLink("other", "https://otro.example")).toMatchObject({ detail: "otro.example" });
  });

  it("el valor editable es el usuario si el enlace es coherente y la URL cruda si no", () => {
    expect(editableValue("instagram", "https://www.instagram.com/ana")).toBe("ana");
    expect(editableValue("instagram", "http://instagram.com")).toBe("http://instagram.com");
    expect(editableValue("other", "https://link.com")).toBe("https://link.com");
  });

  it("guardar un usuario y releerlo devuelve el mismo usuario (ida y vuelta)", () => {
    for (const [kind, raw] of [
      ["instagram", "@ana.perez"],
      ["x", "ana_99"],
      ["tiktok", "@ana"],
      ["youtube", "@mi-canal"],
      ["soundcloud", "mi_banda"],
      ["bandcamp", "mibanda"],
      ["lastfm", "ana_fm"],
      ["discogs", "ana-vinyl"],
      ["spotify", "31abcd"],
    ] as const) {
      const saved = ok(kind, raw);
      expect(editableValue(kind, saved.url), kind).toBe(saved.handle);
    }
  });
});

describe("utilidades de presentación", () => {
  it("hostOf quita el www y devuelve null si la URL no se puede interpretar", () => {
    expect(hostOf("https://www.link.com/x")).toBe("link.com");
    expect(hostOf("no es una url")).toBeNull();
  });

  it("displayUrl quita el esquema y el www para la vista previa", () => {
    expect(displayUrl("https://www.instagram.com/ana")).toBe("instagram.com/ana");
    expect(displayUrl("https://mibanda.bandcamp.com")).toBe("mibanda.bandcamp.com");
  });
});
