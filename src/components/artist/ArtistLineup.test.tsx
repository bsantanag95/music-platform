import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { GroupLineup, LineupMember, PersonLineup } from "@/services/catalog/artist-lineup";
import { GroupLineupView, PersonLineupView } from "./ArtistLineup";
import { ArtistFacts } from "./ArtistHeader";
import { lineupFact, lineupTabOf } from "./lineup-fact";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const lineupEs = catalogEs.artist.lineup;
const span = (beginDate: string | null, endDate: string | null, ended = endDate !== null) => ({ beginDate, endDate, ended });

const member = (artistId: string, name: string, extra: Partial<LineupMember> = {}): LineupMember => ({
  artistId,
  name,
  isFounder: false,
  isAdditional: false,
  deceased: false,
  deathYear: null,
  lines: [],
  affiliations: [],
  pending: false,
  ...extra,
});

const affiliation = (name: string, current = false, support = false) => ({ artistId: name.toLowerCase().replace(/\W+/g, "-"), name, current, support });

const CRUE: GroupLineup = {
  kind: "group",
  lastLineup: false,
  current: [
    member("vince", "Vince Neil", {
      isFounder: true,
      lines: [{ instruments: ["lead vocals"], periods: [span("1981", "1992"), span("1997", "2015"), span("2018", null)] }],
    }),
    member("tommy", "Tommy Lee", {
      isFounder: true,
      lines: [
        { instruments: ["drums (drum set)"], periods: [span("1981", "1999"), span("2004", "2015"), span("2018", null)] },
        { instruments: ["background vocals", "keyboard", "piano"], periods: [span("2018", null)] },
      ],
      affiliations: [affiliation("Methods of Mayhem", true), affiliation("Rock Star Supernova")],
    }),
    member("dj", "DJ Larceny", { isAdditional: true, lines: [{ instruments: ["turntable"], periods: [span(null, null, false)] }] }),
  ],
  past: [
    member("randy", "Randy Castillo", {
      deceased: true,
      deathYear: 2002,
      lines: [{ instruments: ["drums (drum set)"], periods: [span("1999", "2002")] }],
      affiliations: [
        affiliation("Doc Rand"),
        affiliation("Stone Fury"),
        affiliation("Red Square Black"),
        ...Array.from({ length: 11 }, (_, i) => affiliation(`Banda ${i + 1}`)),
        affiliation("Ozzy Osbourne", false, true),
      ],
    }),
  ],
  supportCurrent: [],
  supportPast: [member("maloney", "Samantha Maloney", { lines: [{ instruments: ["drums (drum set)"], periods: [span("2000", "2002")] }] })],
  pending: 0,
};

describe("GroupLineupView", () => {
  it("Completa con los bloques, la barra de sub-vistas y la leyenda", () => {
    renderWithIntl(<GroupLineupView artistId="crue" lineup={CRUE} view="all" />);
    const nav = screen.getByRole("navigation", { name: lineupEs.views.label });
    expect(within(nav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      lineupEs.views.all,
      lineupEs.views.current,
      lineupEs.views.past,
      lineupEs.views.support,
    ]);
    expect(within(nav).getByRole("link", { name: lineupEs.views.all })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: lineupEs.views.past })).toHaveAttribute("href", "/artist/crue/members?view=past");
    expect(screen.getByRole("heading", { name: lineupEs.blocks.current })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: lineupEs.blocks.supportPast })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: lineupEs.blocks.supportCurrent })).not.toBeInTheDocument();
    expect(screen.getByText(`★ ${lineupEs.legendFounder} · † ${lineupEs.legendDied}`)).toBeInTheDocument();
  });

  it("filas al estilo de Metal-Archives: marcas, instrumentos traducidos y años", () => {
    renderWithIntl(<GroupLineupView artistId="crue" lineup={CRUE} view="all" />);
    expect(screen.getByText("Voz principal (1981–1992, 1997–2015, 2018–presente)")).toBeInTheDocument();
    expect(screen.getByText("Batería (1981–1999, 2004–2015, 2018–presente)")).toBeInTheDocument();
    expect(screen.getByText("Coros, teclados, piano (2018–presente)")).toBeInTheDocument();
    expect(screen.getByText("Tornamesa · adicional (período desconocido)")).toBeInTheDocument();
    expect(screen.getAllByText(lineupEs.founder, { selector: ".sr-only" })).toHaveLength(2);
    expect(screen.getByText("(†2002)")).toBeInTheDocument();
  });

  it("También en: actuales, ex- y apoyo; colapsado a 3 con +N y expandible solo en esa fila", () => {
    renderWithIntl(<GroupLineupView artistId="crue" lineup={CRUE} view="all" />);
    expect(screen.getByRole("link", { name: "Methods of Mayhem" })).toHaveAttribute("href", "/artist/methods-of-mayhem");
    expect(screen.getByRole("link", { name: "ex-Rock Star Supernova" })).toBeInTheDocument();
    // Tommy Lee tiene 2: sin control.
    expect(screen.getAllByRole("button")).toHaveLength(1);

    const more = screen.getByRole("button", { name: "Ver 12 bandas más de Randy Castillo" });
    expect(more).toHaveTextContent("+12");
    expect(more).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "ex-Ozzy Osbourne (apoyo)" })).not.toBeInTheDocument();

    fireEvent.click(more);
    expect(screen.getByRole("link", { name: "ex-Ozzy Osbourne (apoyo)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: lineupEs.less })).toHaveAttribute("aria-expanded", "true");
    // La fila de Tommy Lee no cambia.
    expect(screen.getByRole("link", { name: "Methods of Mayhem" })).toBeInTheDocument();
  });

  it("una sub-vista muestra solo su bloque; un grupo separado llama Última alineación a Actual", () => {
    renderWithIntl(<GroupLineupView artistId="crue" lineup={{ ...CRUE, lastLineup: true }} view="current" />);
    expect(screen.getByRole("heading", { name: lineupEs.blocks.lastLineup })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: lineupEs.blocks.past })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: lineupEs.views.lastLineup })).toHaveAttribute("aria-current", "page");
  });

  it("con un solo bloque no hay barra; una sub-vista vacía cae en Completa", () => {
    const onlyCurrent = { ...CRUE, past: [], supportPast: [] };
    renderWithIntl(<GroupLineupView artistId="crue" lineup={onlyCurrent} view="support" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: lineupEs.blocks.current })).toBeInTheDocument();
  });

  it("avisa mientras haya integrantes pendientes", () => {
    const { unmount } = renderWithIntl(<GroupLineupView artistId="crue" lineup={{ ...CRUE, pending: 4 }} view="all" />);
    expect(screen.getByRole("status")).toHaveTextContent(lineupEs.pending);
    unmount();
    renderWithIntl(<GroupLineupView artistId="crue" lineup={CRUE} view="all" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("PersonLineupView", () => {
  const TOMMY: PersonLineup = {
    kind: "person",
    groups: [
      {
        artistId: "crue",
        name: "Mötley Crüe",
        photoUrl: null,
        isFounder: true,
        current: true,
        lines: [{ instruments: ["drums (drum set)"], periods: [span("1981", "1999"), span("2004", null)] }],
        groupBegin: "1981",
        groupEnd: null,
        groupEnded: false,
        mainCount: 9,
      },
      {
        artistId: "mom",
        name: "Methods of Mayhem",
        photoUrl: null,
        isFounder: false,
        current: false,
        lines: [],
        groupBegin: null,
        groupEnd: null,
        groupEnded: null,
        mainCount: null,
      },
    ],
    supportFor: [{ artistId: "ozzy", name: "Ozzy Osbourne", current: false, lines: [{ instruments: ["drums (drum set)"], periods: [span("2000", "2000")] }] }],
    supportersCurrent: [member("band", "Baterista de gira", { lines: [{ instruments: ["drums (drum set)"], periods: [span("2020", null)] }] })],
    supportersPast: [],
    pending: 0,
  };

  it("bloques Bandas, Apoyo para y Músicos de apoyo", () => {
    renderWithIntl(<PersonLineupView lineup={TOMMY} />);
    const crue = screen.getByRole("link", { name: /Mötley Crüe/ });
    expect(crue).toHaveAttribute("href", "/artist/crue");
    expect(crue).toHaveTextContent("Batería (1981–1999, 2004–presente)");
    expect(crue).toHaveTextContent("1981–presente · 9 discos principales");
    expect(screen.getByRole("link", { name: /Methods of Mayhem/ })).not.toHaveTextContent(/discos principales/);
    expect(screen.getByRole("heading", { name: lineupEs.blocks.supportFor })).toBeInTheDocument();
    expect(screen.getByText("Batería (2000)")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: lineupEs.blocks.supporters })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Baterista de gira" })).toBeInTheDocument();
  });

  it("omite los bloques vacíos", () => {
    renderWithIntl(<PersonLineupView lineup={{ ...TOMMY, supportFor: [], supportersCurrent: [] }} />);
    expect(screen.queryByRole("heading", { name: lineupEs.blocks.supportFor })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: lineupEs.blocks.supporters })).not.toBeInTheDocument();
  });

  it("lineupFact de una persona: actuales primero, luego la salida más reciente", () => {
    const fact = lineupFact(
      {
        ...TOMMY,
        groups: [
          { ...TOMMY.groups[1]!, artistId: "old", name: "Vieja", lines: [{ instruments: [], periods: [span("1975", "1978")] }] },
          { ...TOMMY.groups[1]!, artistId: "recent", name: "Reciente", lines: [{ instruments: [], periods: [span("2005", "2010")] }] },
          TOMMY.groups[0]!,
        ],
      },
      "tommy",
    );
    expect(fact).toEqual({
      label: "bands",
      people: [
        { id: "crue", name: "Mötley Crüe" },
        { id: "recent", name: "Reciente" },
        { id: "old", name: "Vieja" },
      ],
      href: "/artist/tommy/members",
      more: "seeAll",
    });
  });
});

describe("lineupFact y lineupTabOf de un grupo", () => {
  it("hasta 5 nombres de la alineación actual con enlace a la sub-vista Actual", () => {
    const six = { ...CRUE, current: Array.from({ length: 6 }, (_, i) => member(`p${i}`, `Persona ${i}`)) };
    const fact = lineupFact(six, "crue")!;
    expect(fact.label).toBe("members");
    expect(fact.people).toHaveLength(5);
    expect(fact.href).toBe("/artist/crue/members?view=current");
    expect(lineupFact({ ...CRUE, lastLineup: true }, "crue")!.label).toBe("lastLineup");
  });

  it("sin alineación actual no hay fila; sin personas no hay pestaña", () => {
    expect(lineupFact({ ...CRUE, current: [] }, "crue")).toBeNull();
    expect(lineupTabOf(CRUE)).toBe("members");
    expect(lineupTabOf({ ...CRUE, current: [], past: [], supportPast: [] })).toBeNull();
  });
});

describe("fila de la alineación en la ficha", () => {
  it("nombres enlazados y 'Ver alineación', antes de Enlaces", () => {
    renderWithIntl(
      <ArtistFacts
        type="group"
        firstMainYear={null}
        profile={{
          facts: { country: "US", beginAreaName: null, lifeBegin: "1981", lifeEnd: null, lifeEnded: false },
          links: [{ kind: "official", url: "https://motley.com" }],
          description: null,
          summary: null,
          placeLabel: null,
          photo: null,
        }}
        lineup={lineupFact(CRUE, "crue")}
      />,
    );
    const terms = screen.getAllByRole("term").map((dt) => dt.textContent);
    expect(terms.indexOf(catalogEs.artist.facts.members)).toBe(terms.indexOf(catalogEs.artist.facts.links) - 1);
    expect(screen.getByRole("link", { name: "Vince Neil" })).toHaveAttribute("href", "/artist/vince");
    expect(screen.getByRole("link", { name: `${catalogEs.artist.facts.seeLineup} →` })).toHaveAttribute(
      "href",
      "/artist/crue/members?view=current",
    );
  });
});
