// Fixtures sintéticos compartidos por `smoke-test-album-editions.ts` y
// `smoke-test-personnel-credits.ts` (openspec: enrich-album-editions-and-credits).
//
// Todos los MBID siguen el patrón sintético `*-0000-4000-8000-*` (AGENTS.md): no chocan
// con el catálogo real y son fáciles de limpiar. Las respuestas imitan la forma de las
// reales de MusicBrainz (ver src/services/musicbrainz/__fixtures__/).

/** MBID sintético determinista. */
export function smokeMbid(prefix: string, n: number): string {
  return `${prefix.padEnd(8, "0").slice(0, 8)}-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

export const SMOKE_PREFIX = "5e0ce000";

export const IDS = {
  releaseGroup: smokeMbid(SMOKE_PREFIX, 1),
  band: smokeMbid(SMOKE_PREFIX, 2),
  member: smokeMbid(SMOKE_PREFIX, 3),
  guest: smokeMbid(SMOKE_PREFIX, 4),
  engineer: smokeMbid(SMOKE_PREFIX, 5),
  designer: smokeMbid(SMOKE_PREFIX, 6),
  label: smokeMbid(SMOKE_PREFIX, 7),
  original: smokeMbid(SMOKE_PREFIX, 0x100),
  fused: smokeMbid(SMOKE_PREFIX, 0x101),
  experienceGb: smokeMbid(SMOKE_PREFIX, 0x102),
  experienceUs: smokeMbid(SMOKE_PREFIX, 0x103),
  sacd: smokeMbid(SMOKE_PREFIX, 0x104),
  box: smokeMbid(SMOKE_PREFIX, 0x105),
  recording: (n: number) => smokeMbid(SMOKE_PREFIX, 0x1000 + n),
};

export const ALBUM_TITLE = "Álbum de humo (smoke)";

const releaseGroupEmbed = {
  id: IDS.releaseGroup,
  title: ALBUM_TITLE,
  "first-release-date": "1973-03-24",
  "primary-type": "Album",
  "secondary-types": [],
};

function edition(
  id: string,
  overrides: {
    status?: string;
    date?: string;
    country?: string;
    disambiguation?: string;
    packaging?: string | null;
    media: { format: string; "track-count": number }[];
    catalog?: string;
  },
) {
  return {
    id,
    title: ALBUM_TITLE,
    status: overrides.status ?? "Official",
    date: overrides.date ?? "1973-03-24",
    country: overrides.country ?? "GB",
    packaging: overrides.packaging ?? null,
    disambiguation: overrides.disambiguation ?? "",
    media: overrides.media.map((m, i) => ({ position: i + 1, ...m })),
    "label-info": [{ "catalog-number": overrides.catalog ?? "SMK 001", label: { id: IDS.label, name: "Sello de humo" } }],
    "release-group": releaseGroupEmbed,
  };
}

/**
 * Browse `/release?release-group=` con 6 ediciones: la original, una fusionada, dos
 * Experience, un SACD y una caja. `onlyExperienceOfficial` deja oficiales solo las
 * Experience, para forzar que la re-canonicalización elija una edición ya ingerida.
 */
export function editionsBrowse(onlyExperienceOfficial = false) {
  const releases = [
    edition(IDS.original, { media: [{ format: '12" Vinyl', "track-count": 4 }] }),
    edition(IDS.fused, { date: "1980-01-01", media: [{ format: "CD", "track-count": 3 }] }),
    edition(IDS.experienceGb, {
      date: "2011-09-26",
      disambiguation: "Experience Edition, printed in EU",
      media: [
        { format: "CD", "track-count": 4 },
        { format: "CD", "track-count": 3 },
      ],
    }),
    edition(IDS.experienceUs, {
      date: "2011-09-27",
      country: "US",
      disambiguation: "Experience Edition, printed in USA",
      media: [
        { format: "CD", "track-count": 4 },
        { format: "CD", "track-count": 3 },
      ],
    }),
    edition(IDS.sacd, {
      date: "2003-03-01",
      disambiguation: "30th anniversary edition",
      media: [
        { format: "Hybrid SACD (CD layer)", "track-count": 4 },
        { format: "Hybrid SACD (SACD layer, 2 channels)", "track-count": 4 },
        { format: "Hybrid SACD (SACD layer, multichannel)", "track-count": 4 },
      ],
    }),
    edition(IDS.box, {
      date: "2011-09-26",
      disambiguation: "Immersion box set",
      packaging: "Box",
      media: Array.from({ length: 6 }, () => ({ format: "CD", "track-count": 6 })),
    }),
  ];
  if (onlyExperienceOfficial) {
    for (const r of releases) {
      if (r.id !== IDS.experienceGb && r.id !== IDS.experienceUs) r.status = "Bootleg";
    }
  }
  return { "release-count": releases.length, "release-offset": 0, releases };
}

const TITLES = ["Hablame", "Respirá", "Tiempo", "Dinero"];

function artistRel(type: string, artistId: string, name: string, attributes: string[] = []) {
  return {
    type,
    "target-type": "artist",
    direction: "backward",
    attributes,
    "target-credit": "",
    artist: { id: artistId, name, type: "Person" },
  };
}

function trackOf(n: number, title: string) {
  return {
    position: n,
    recording: {
      id: IDS.recording(n),
      title,
      length: 180_000 + n * 1000,
      relations: [
        artistRel("instrument", IDS.member, "Integrante de humo", ["guitar"]),
        ...(n === 3 ? [artistRel("vocal", IDS.guest, "Invitada de humo", ["lead vocals"])] : []),
        artistRel("engineer", IDS.engineer, "Ingeniero de humo"),
      ],
    },
    "artist-credit": [{ name: "Banda de humo", joinphrase: "", artist: { id: IDS.band, name: "Banda de humo" } }],
  };
}

/** `GET /release/{original}` con 4 pistas y créditos de personal. */
export function originalRelease() {
  return {
    id: IDS.original,
    title: ALBUM_TITLE,
    date: "1973-03-24",
    relations: [artistRel("design/illustration", IDS.designer, "Diseño de humo")],
    media: [{ position: 1, tracks: TITLES.map((t, i) => trackOf(i + 1, t)) }],
  };
}

/** `GET /release/{experienceGb}`: la lista original + disco 2 con un remaster (no adicional), una en vivo y una demo. */
export function experienceRelease() {
  return {
    id: IDS.experienceGb,
    title: ALBUM_TITLE,
    date: "2011-09-26",
    relations: [],
    media: [
      { position: 1, tracks: TITLES.map((t, i) => trackOf(i + 1, t)) },
      {
        position: 2,
        tracks: [
          trackOf(10, "Dinero - 2011 Remaster"),
          trackOf(11, "Dinero (Live)"),
          trackOf(12, "Tiempo (Demo)"),
        ],
      },
    ],
  };
}

/** `GET /artist/{band}?inc=artist-rels`: la banda con un integrante. */
export function bandWithMembers() {
  return {
    id: IDS.band,
    name: "Banda de humo",
    type: "Group",
    relations: [
      {
        type: "member of band",
        direction: "backward",
        attributes: ["guitar"],
        begin: "1965",
        end: null,
        artist: { id: IDS.member, name: "Integrante de humo", type: "Person" },
      },
    ],
  };
}

/** Cuenta requests por ruta y sirve los fixtures; falla ante una ruta sin mock. */
export function mockMusicBrainz(routes: Record<string, () => unknown>) {
  const calls: string[] = [];
  const realFetch = global.fetch;
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input.toString());
    const key =
      url.pathname === "/ws/2/release" && url.searchParams.has("release-group")
        ? "browse"
        : url.pathname.replace("/ws/2/", "");
    calls.push(key);
    const handler = routes[key];
    if (!handler) throw new Error(`No hay mock para: ${url.pathname}${url.search}`);
    return new Response(JSON.stringify(handler()), { status: 200 });
  }) as typeof fetch;
  return { calls, restore: () => (global.fetch = realFetch) };
}
