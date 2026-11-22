import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { IdentityStrip } from "./IdentityStrip";
import type { MusicIdentityData } from "@/lib/music-identity";
import type { FollowedArtist } from "@/services/social/artist-following";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
// Las partes async se prueban aparte: acá solo importa cuáles se componen.
vi.mock("./FingerprintSummary", () => ({
  FingerprintSummary: ({ topDecade }: { topDecade: string | null }) => <div data-testid="fingerprint">{topDecade}</div>,
}));
vi.mock("./ExploreSection", () => ({
  ExploreSection: ({ totalCount }: { totalCount: number }) => <div data-testid="artists">{totalCount}</div>,
}));

// El modo edición se prueba en EditableBlock: acá solo importa dónde se envuelve la Ficha.
vi.mock("./EditableBlock", () => ({
  EditableBlock: ({ label, empty, children }: { label: string; empty?: boolean; children: ReactNode }) => (
    <div data-testid="editable" data-label={label} data-empty={String(Boolean(empty))}>
      {children}
    </div>
  ),
}));

const empty: MusicIdentityData = { selfRoles: [], genres: [], listeningFormats: [], prompts: [] };
const withMusic = {
  selfRoles: ["collector", "dj"],
  genres: ["post-punk", "jazz"],
  listeningFormats: ["vinyl", "streaming"],
  prompts: [{ promptKey: "first-record", answer: "Un casete de Los Prisioneros", position: 0 }],
} as MusicIdentityData;
const genreLabels = { "post-punk": "post-punk", jazz: "jazz" };
const artists: FollowedArtist[] = [{ id: "a1", name: "Ratt", type: "group", photoUrl: null }];

function strip(over: Partial<Parameters<typeof IdentityStrip>[0]> = {}) {
  return IdentityStrip({
    username: "ana",
    identity: withMusic,
    genreLabels,
    fingerprint: { topDecade: "1980s", phrases: ["Su familia más presente es Rock"] },
    artists,
    artistsTotal: 10,
    ...over,
  });
}

describe("IdentityStrip (spec social-profiles, 'Franja de identidad')", () => {
  it("franja completa: ficha, huella y artistas seguidos", async () => {
    renderWithIntl(await strip());
    expect(screen.getByRole("heading", { name: "strip.ficha" })).toBeInTheDocument();
    expect(screen.getByTestId("fingerprint")).toHaveTextContent("1980s");
    expect(screen.getByTestId("artists")).toHaveTextContent("10");
  });

  it("la ficha muestra soy, géneros, escucho en y las preguntas", async () => {
    renderWithIntl(await strip());
    expect(screen.getByLabelText("musicIdentity.ficha.aria")).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.roles.collector · musicIdentity.roles.dj")).toBeInTheDocument();
    expect(screen.getByText("post-punk · jazz")).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.formats.vinyl · musicIdentity.formats.streaming")).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.prompts.first-record.short")).toBeInTheDocument();
    expect(screen.getByText("Un casete de Los Prisioneros")).toBeInTheDocument();
  });

  it("solo géneros: la ficha muestra únicamente esa fila", async () => {
    renderWithIntl(await strip({ identity: { ...empty, genres: ["jazz"] } }));
    expect(screen.getByText("musicIdentity.ficha.genres")).toBeInTheDocument();
    expect(screen.queryByText("musicIdentity.ficha.roles")).not.toBeInTheDocument();
    expect(screen.queryByText("musicIdentity.ficha.formats")).not.toBeInTheDocument();
  });

  it("sin huella de gusto: ficha y artistas, sin espacio vacío", async () => {
    renderWithIntl(await strip({ fingerprint: null }));
    expect(screen.queryByTestId("fingerprint")).not.toBeInTheDocument();
    expect(screen.getByLabelText("musicIdentity.ficha.aria")).toBeInTheDocument();
    expect(screen.getByTestId("artists")).toBeInTheDocument();
  });

  it("sin ficha ni artistas seguidos: solo la huella", async () => {
    renderWithIntl(await strip({ identity: empty, artists: [] }));
    expect(screen.queryByLabelText("musicIdentity.ficha.aria")).not.toBeInTheDocument();
    expect(screen.queryByTestId("artists")).not.toBeInTheDocument();
    expect(screen.getByTestId("fingerprint")).toBeInTheDocument();
  });

  it("un género retirado no cuenta como ficha", async () => {
    renderWithIntl(await strip({ identity: { ...empty, genres: ["retirado"] }, fingerprint: null }));
    expect(screen.queryByLabelText("musicIdentity.ficha.aria")).not.toBeInTheDocument();
  });

  it("sin ninguna parte, la franja no se dibuja", async () => {
    expect(
      await strip({ identity: empty, fingerprint: { topDecade: null, phrases: [] }, artists: [] }),
    ).toBeNull();
  });

  describe("Ficha editable del dueño (redesign-owner-profile-phase3)", () => {
    const fichaEdit = { label: "Ficha", editor: <p>editor</p> };

    it("envuelve la Ficha en su bloque editable", async () => {
      renderWithIntl(await strip({ fichaEdit }));
      const block = screen.getByTestId("editable");
      expect(block).toHaveAttribute("data-label", "Ficha");
      expect(block).toHaveAttribute("data-empty", "false");
      expect(screen.getByRole("heading", { name: "strip.ficha" })).toBeInTheDocument();
    });

    it("Ficha vacía con otras partes: bloque vacío dentro de la franja", async () => {
      renderWithIntl(await strip({ identity: empty, fichaEdit }));
      expect(screen.getByTestId("editable")).toHaveAttribute("data-empty", "true");
      expect(screen.getByTestId("fingerprint")).toBeInTheDocument();
    });

    it("sin ninguna parte, el dueño igual recibe el bloque vacío de la Ficha", async () => {
      const tree = await strip({ identity: empty, fingerprint: null, artists: [], fichaEdit });
      renderWithIntl(<>{tree}</>);
      expect(screen.getByTestId("editable")).toHaveAttribute("data-empty", "true");
    });

    it("sin ninguna parte y sin edición (visitante) no hay franja", async () => {
      expect(await strip({ identity: empty, fingerprint: null, artists: [] })).toBeNull();
    });
  });
});
