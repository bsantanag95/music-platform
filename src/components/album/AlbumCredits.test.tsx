import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumCredits, LEVEL_OPEN_MAX } from "./AlbumCredits";
import { formatRoles, formatTrackList, messageKey } from "./credit-roles";
import type { PersonnelEntry, PersonnelLevel } from "@/services/catalog/personnel-levels";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
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
              tracks: [{ discNumber: 1, position: 5 }],
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
    expect(screen.getByText("Artista principal")).toBeInTheDocument();
    expect(screen.queryByText(credits.levels.members)).not.toBeInTheDocument();
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

  it("muestra el nombre acreditado cuando difiere", () => {
    renderWithIntl(
      <AlbumCredits leadKind="group" multiDisc={false} levels={levels({ guests: [entry("Storm Thorgerson", { creditedAs: "Storm" })] })} />,
    );
    expect(screen.getByText("acreditado como Storm")).toBeInTheDocument();
  });
});
