import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumCredits } from "./AlbumCredits";
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
    expect(screen.getByText("guitarra · todas")).toBeInTheDocument();
    expect(screen.getByText("voz principal · pista 5")).toBeInTheDocument();
    expect(screen.getByText("theremin · todas")).toBeInTheDocument();
    expect(screen.getByText("ingeniería · todas")).toBeInTheDocument();
    expect(screen.queryByText(credits.levels.other, { exact: false })).not.toBeInTheDocument();
  });

  it("deja Arte y otros contraído con la cantidad de créditos", () => {
    renderWithIntl(
      <AlbumCredits
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

  it("muestra el nombre acreditado cuando difiere", () => {
    renderWithIntl(
      <AlbumCredits multiDisc={false} levels={levels({ guests: [entry("Storm Thorgerson", { creditedAs: "Storm" })] })} />,
    );
    expect(screen.getByText("acreditado como Storm")).toBeInTheDocument();
  });
});
