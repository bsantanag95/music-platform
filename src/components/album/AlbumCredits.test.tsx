import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumCredits, LEVEL_OPEN_MAX } from "./AlbumCredits";
import { formatRoles, formatTrackList, messageKey } from "./credit-roles";
import type { PersonnelEntry, PersonnelLevel, TrackCreditGroups } from "@/services/catalog/personnel-levels";

vi.mock("@/i18n/navigation", () => ({
  // Reenvía title, aria-label y aria-current; `scroll` es de next/link y no va al <a>.
  Link: (props: { href: string; children: React.ReactNode; scroll?: boolean } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const anchor: Record<string, unknown> = { ...props };
    delete anchor.scroll;
    return <a {...(anchor as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  },
}));

const credits = catalogEs.album.credits;

function entry(artistId: string, overrides: Partial<PersonnelEntry> = {}): PersonnelEntry {
  return { artistId, name: artistId, creditedAs: null, level: "guests", roles: [], tracks: "all", ...overrides };
}

function levels(partial: Partial<Record<PersonnelLevel, PersonnelEntry[]>>): Record<PersonnelLevel, PersonnelEntry[]> {
  return { members: [], guests: [], production: [], other: [], ...partial };
}

describe("messageKey", () => {
  it("convierte tipos y atributos de MusicBrainz en claves de mensaje", () => {
    expect(messageKey("design/illustration")).toBe("design_illustration");
    expect(messageKey("lead vocals")).toBe("lead_vocals");
    expect(messageKey("drums (drum set)")).toBe("drums_drum_set");
  });
});

describe("formatRoles", () => {
  const label = (kind: "roles" | "attributes", raw: string) => `${kind}:${raw}`;

  it("muestra instrumentos y voz por sus atributos, y el resto por su tipo con matices", () => {
    expect(
      formatRoles(
        [
          { relationType: "instrument", attributes: ["guitar", "piano"] },
          { relationType: "vocal", attributes: [] },
          { relationType: "engineer", attributes: ["assistant"] },
          { relationType: "instrument", attributes: ["guitar"] },
        ],
        label,
      ),
    ).toEqual(["attributes:guitar", "attributes:piano", "roles:vocal", "roles:engineer (attributes:assistant)"]);
  });
});

describe("formatRoles con modificadores", () => {
  const es = (kind: "roles" | "attributes", raw: string) =>
    ((catalogEs.album.credits[kind] as Record<string, string>)[messageKey(raw)] ?? raw);
  const compound = (type: string, modifier: string) =>
    (catalogEs.album.credits.roles as Record<string, string>)[`${messageKey(type)}_${messageKey(modifier)}`] ?? null;

  it("omite 'adicional' en instrumentos y no repite el instrumento", () => {
    expect(
      formatRoles(
        [
          { relationType: "instrument", attributes: ["additional", "keyboard"] },
          { relationType: "instrument", attributes: ["keyboard"] },
          { relationType: "vocal", attributes: ["additional", "background vocals"] },
        ],
        es,
        compound,
      ),
    ).toEqual(["teclados", "coros"]);
  });

  it("usa etiquetas compuestas y traduce membranophone como percusión", () => {
    expect(
      formatRoles(
        [
          { relationType: "producer", attributes: ["co"] },
          { relationType: "instrument", attributes: ["membranophone"] },
          { relationType: "programming", attributes: ["membranophone"] },
        ],
        es,
        compound,
      ),
    ).toEqual(["coproducción", "percusión", "programación (percusión)"]);
  });

  it("'solo' queda como matiz del instrumento", () => {
    expect(formatRoles([{ relationType: "instrument", attributes: ["solo", "guitar"] }], es, compound)).toEqual([
      "guitarra (solo)",
    ]);
  });
});

describe("formatTrackList", () => {
  it("usa disco-pista cuando el álbum tiene varios discos", () => {
    const tracks = [
      { discNumber: 1, position: 3 },
      { discNumber: 2, position: 1 },
    ];
    expect(formatTrackList(tracks, false)).toBe("3, 1");
    expect(formatTrackList(tracks, true)).toBe("1-3, 2-1");
  });
});

describe("AlbumCredits", () => {
  it("muestra los niveles con roles traducidos, pistas y el fallback al texto de MusicBrainz", () => {
    renderWithIntl(
      <AlbumCredits
        leadKind="group"
        multiDisc={false}
        levels={levels({
          members: [entry("Gilmour", { roles: [{ relationType: "instrument", attributes: ["guitar"] }] })],
          guests: [
            entry("Torry", {
              roles: [{ relationType: "vocal", attributes: ["lead vocals"] }],
              tracks: [{ recordingId: "rec-5", discNumber: 1, position: 5 }],
            }),
            entry("Theremin", { roles: [{ relationType: "instrument", attributes: ["theremin"] }] }),
          ],
          production: [entry("Parsons", { roles: [{ relationType: "engineer", attributes: [] }] })],
        })}
      />,
    );

    expect(screen.getByText(credits.levels.members)).toBeInTheDocument();
    expect(screen.getByText("guitarra")).toBeInTheDocument();
    expect(screen.getByText("voz principal")).toBeInTheDocument();
    expect(screen.getByText("pista 5")).toBeInTheDocument();
    expect(screen.getByText("theremin")).toBeInTheDocument();
    expect(screen.getByText("ingeniería")).toBeInTheDocument();
    expect(screen.getAllByText(credits.allTracks)).toHaveLength(3);
    expect(screen.queryByText(credits.levels.other, { exact: false })).not.toBeInTheDocument();
  });

  it("deja Arte y otros contraído con la cantidad de créditos", () => {
    renderWithIntl(
      <AlbumCredits
        leadKind="group"
        multiDisc={false}
        levels={levels({
          other: [
            entry("Hipgnosis", { roles: [{ relationType: "design/illustration", attributes: [] }] }),
            entry("Storm", { roles: [{ relationType: "photography", attributes: [] }] }),
          ],
        })}
      />,
    );
    const summary = screen.getByText(`${credits.levels.other} · +2 créditos`);
    expect(summary.closest("details")).not.toHaveAttribute("open");
  });

  it("rotula 'Artista principal' cuando el principal es una persona", () => {
    renderWithIntl(
      <AlbumCredits leadKind="person" multiDisc={false} levels={levels({ members: [entry("Sabrina", { level: "members" })] })} />,
    );
    const heading = screen.getByText("Artista principal");
    expect(screen.queryByText(credits.levels.members)).not.toBeInTheDocument();
    // Línea compacta: sin el bloque destacado de las bandas.
    expect(heading.closest("section")).not.toHaveClass("bg-ink-surface");
  });

  it("una banda mantiene el bloque destacado de integrantes", () => {
    renderWithIntl(
      <AlbumCredits leadKind="group" multiDisc={false} levels={levels({ members: [entry("Gilmour", { level: "members" })] })} />,
    );
    expect(screen.getByText(credits.levels.members).closest("section")).toHaveClass("bg-ink-surface");
  });

  it("el título 'Créditos' queda solo para lectores de pantalla", () => {
    renderWithIntl(<AlbumCredits leadKind="group" multiDisc={false} levels={levels({ guests: [entry("Uno")] })} />);
    expect(screen.getByRole("heading", { name: credits.heading })).toHaveClass("sr-only");
  });

  it("contrae un nivel largo con cantidad y tres nombres; deja abierto uno corto", () => {
    const many = Array.from({ length: LEVEL_OPEN_MAX + 1 }, (_, i) => entry(`Invitado ${i + 1}`));
    const few = [entry("Ingeniera", { level: "production" })];
    renderWithIntl(<AlbumCredits leadKind="group" multiDisc={false} levels={levels({ guests: many, production: few })} />);

    const summary = screen.getByText("7 · Invitado 1, Invitado 2, Invitado 3 y 4 más");
    expect(summary.closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText(credits.levels.production).closest("details")).toHaveAttribute("open");
  });

  it("muestra 4 roles y '+N' con el resto", () => {
    const attributes = ["guitar", "bass", "piano", "organ", "violin", "cello"];
    renderWithIntl(
      <AlbumCredits
        leadKind="group"
        multiDisc={false}
        levels={levels({ guests: [entry("Multi", { roles: attributes.map((a) => ({ relationType: "instrument", attributes: [a] })) })] })}
      />,
    );
    expect(screen.getByText("guitarra, bajo, piano, órgano", { exact: false })).toBeInTheDocument();
    const more = screen.getByLabelText("Ver 2 roles más");
    expect(more).toHaveTextContent("+2");
    expect(more.closest("details")).not.toHaveAttribute("open");
    expect(screen.getByText(", violín, violonchelo")).toBeInTheDocument();
  });

  it("con 5 roles los muestra todos, sin '+N'", () => {
    const attributes = ["guitar", "bass", "piano", "organ", "violin"];
    renderWithIntl(
      <AlbumCredits
        leadKind="group"
        multiDisc={false}
        levels={levels({ guests: [entry("Cinco", { roles: attributes.map((a) => ({ relationType: "instrument", attributes: [a] })) })] })}
      />,
    );
    expect(screen.getByText("guitarra, bajo, piano, órgano, violín")).toBeInTheDocument();
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
  });

  it("un instrumento sin especificar se rotula 'varios instrumentos'", () => {
    renderWithIntl(
      <AlbumCredits
        leadKind="group"
        multiDisc={false}
        levels={levels({ guests: [entry("Gordon", { roles: [{ relationType: "instrument", attributes: [] }] })] })}
      />,
    );
    expect(screen.getByText("varios instrumentos")).toBeInTheDocument();
  });

  it("los números de pista enlazan a la canción y anuncian su título", () => {
    renderWithIntl(
      <AlbumCredits
        leadKind="group"
        multiDisc={false}
        tracks={[
          { recordingId: "rec-2", title: "Tears", discNumber: 1, position: 2 },
          { recordingId: "rec-3", title: "My Man on Willpower", discNumber: 1, position: 3 },
        ]}
        levels={levels({
          guests: [
            entry("McGorman", {
              tracks: [
                { recordingId: "rec-2", discNumber: 1, position: 2 },
                { recordingId: "rec-3", discNumber: 1, position: 3 },
              ],
            }),
          ],
        })}
      />,
    );
    const link = screen.getByRole("link", { name: "Pista 2: Tears" });
    expect(link).toHaveAttribute("href", "/song/rec-2");
    expect(link).toHaveTextContent("2");
    expect(link).toHaveAttribute("title", "Tears");
    expect(screen.getByRole("link", { name: "Pista 3: My Man on Willpower" })).toBeInTheDocument();
  });

  it("muestra el nombre acreditado cuando difiere", () => {
    renderWithIntl(
      <AlbumCredits leadKind="group" multiDisc={false} levels={levels({ guests: [entry("Storm Thorgerson", { creditedAs: "Storm" })] })} />,
    );
    expect(screen.getByText("acreditado como Storm")).toBeInTheDocument();
  });
});

describe("AlbumCredits — vista por canción", () => {
  const TRACKS = [
    { recordingId: "rec-1", title: "Manchild", discNumber: 1, position: 1 },
    { recordingId: "rec-8", title: "Sugar Talking", discNumber: 1, position: 8 },
  ];
  const person = (artistId: string, relationType: string, attributes: string[] = []) => ({
    artistId,
    name: artistId,
    creditedAs: null,
    roles: [{ relationType, attributes }],
  });
  const groups = (partial: Partial<TrackCreditGroups>): TrackCreditGroups => ({
    songwriting: [],
    production: [],
    performers: [],
    sound: [],
    other: [],
    ...partial,
  });
  const byTrack = {
    albumWide: groups({ sound: [person("Mastering Guy", "mastering")] }),
    tracks: {
      "rec-8": groups({
        production: [person("Jon Levine", "producer")],
        performers: [person("Jon Sosin", "instrument", ["ukulele"])],
      }),
    },
  };

  function renderSongs(view: "people" | "songs") {
    return renderWithIntl(
      <AlbumCredits
        leadKind="person"
        multiDisc={false}
        levels={levels({ guests: [entry("Jon Sosin")] })}
        tracks={TRACKS}
        byTrack={byTrack}
        view={view}
        releaseGroupId="rg-1"
      />,
    );
  }

  it("el control de vista marca la activa y enlaza con ?view=songs", () => {
    renderSongs("people");
    const nav = screen.getByRole("navigation", { name: credits.viewLabel });
    expect(within(nav).getByRole("link", { name: credits.viewPeople })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: credits.viewSongs })).toHaveAttribute("href", "/album/rg-1/credits?view=songs");
  });

  it("por canción lista las pistas en orden con Producción e Intérpretes, sin repetir 'producción'", () => {
    renderSongs("songs");
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual([credits.albumWide, "1Manchild", "8Sugar Talking"]);
    expect(screen.getByRole("link", { name: "Sugar Talking" })).toHaveAttribute("href", "/song/rec-8");
    expect(screen.getByText(credits.groups.production)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Jon Levine" }).parentElement).toHaveTextContent(/^Jon Levine$/);
    expect(screen.getByText("(ukelele)")).toBeInTheDocument();
  });

  it("indica las pistas sin créditos y muestra una vez los créditos de todo el álbum", () => {
    renderSongs("songs");
    expect(screen.getByText(credits.noTrackCredits)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Mastering Guy" })).toHaveLength(1);
  });

  it("sin la agrupación por canción no ofrece el control de vista", () => {
    renderWithIntl(<AlbumCredits leadKind="group" multiDisc={false} levels={levels({ guests: [entry("Uno")] })} view="songs" />);
    expect(screen.queryByRole("navigation", { name: credits.viewLabel })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Uno" })).toBeInTheDocument();
  });
});

describe("AlbumCredits — composición", () => {
  const writerEntry = (name: string, tracks: PersonnelEntry["tracks"] = "all", relationType = "writer") => ({
    artistId: name,
    name,
    creditedAs: null,
    roles: [{ relationType, attributes: [] as string[] }],
    tracks,
  });

  it("muestra la sección Composición tras el primer nivel, aunque la persona también produzca", () => {
    renderWithIntl(
      <AlbumCredits
        leadKind="group"
        multiDisc={false}
        levels={levels({
          members: [entry("Gilmour", { level: "members" })],
          production: [entry("Mitch Allan", { level: "production", roles: [{ relationType: "producer", attributes: [] }] })],
        })}
        songwriters={[writerEntry("Mitch Allan"), writerEntry("Compositora", "all", "composer")]}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent?.replace("›", ""));
    expect(headings).toEqual([credits.levels.members, credits.levels.songwriting, credits.levels.production]);
    expect(screen.getAllByRole("link", { name: "Mitch Allan" })).toHaveLength(2);
    expect(screen.getByText("música")).toBeInTheDocument();
  });

  it("sin autores no muestra la sección", () => {
    renderWithIntl(<AlbumCredits leadKind="group" multiDisc={false} levels={levels({ guests: [entry("Uno")] })} songwriters={[]} />);
    expect(screen.queryByText(credits.levels.songwriting)).not.toBeInTheDocument();
  });

  it("en la vista por canción, Composición va primero y omite el rol 'composición' obvio", () => {
    const people = (...names: [string, string][]) =>
      names.map(([name, relationType]) => ({ artistId: name, name, creditedAs: null, roles: [{ relationType, attributes: [] as string[] }] }));
    renderWithIntl(
      <AlbumCredits
        leadKind="person"
        multiDisc={false}
        levels={levels({ production: [entry("Productor", { level: "production" })] })}
        tracks={[{ recordingId: "rec-1", title: "Eyes Wide Open", discNumber: 1, position: 1 }]}
        byTrack={{
          albumWide: { songwriting: [], production: [], performers: [], sound: [], other: [] },
          tracks: {
            "rec-1": {
              songwriting: people(["Jerrod Bettis", "writer"], ["Letrista", "lyricist"]),
              production: people(["Productor", "producer"]),
              performers: [],
              sound: [],
              other: [],
            },
          },
        }}
        view="songs"
        releaseGroupId="rg-1"
      />,
    );
    const terms = screen.getAllByRole("term").map((dt) => dt.textContent);
    expect(terms).toEqual([credits.groups.songwriting, credits.groups.production]);
    expect(screen.getByRole("link", { name: "Jerrod Bettis" }).parentElement).toHaveTextContent(/^Jerrod Bettis, Letrista \(letra\)$/);
  });
});

