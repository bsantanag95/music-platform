import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  lamina: vi.fn(),
  album: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const messages = (await import("../../../../../../../messages/es/laminas.json")).default;
  return {
    getLocale: vi.fn().mockResolvedValue("es"),
    getTranslations: vi.fn(async (namespace: string) => createTranslator({ locale: "es", messages: { laminas: messages }, namespace: namespace as "laminas" })),
  };
});
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.session }));
vi.mock("@/services/laminas/discography", () => ({ getDiscographyLamina: mocks.lamina, getDiscographyAlbum: mocks.album }));
vi.mock("@/components/laminas/DiscographySettings", () => ({ DiscographySettings: () => <div>ajustes</div> }));
vi.mock("@/components/laminas/TierFromDiscographyButton", () => ({
  TierFromDiscographyButton: ({ artistName }: { artistName: string }) => <button>{`tier list de ${artistName}`}</button>,
}));
vi.mock("@/components/laminas/RateInline", () => ({ RateInline: ({ target, title }: { target: string; title: string }) => <span>{`valorar:${target}:${title}`}</span> }));
vi.mock("@/services/share/metadata", () => ({ buildShareMetadata: vi.fn() }));
vi.mock("@/services/share/targets/discography", () => ({
  discographyRef: (userId: string, artistId: string, albumId?: string) => [userId, artistId, albumId].filter(Boolean).join("."),
  discographyRefFor: vi.fn(),
}));
vi.mock("@/i18n/client-messages", () => ({ withClientMessages: (_route: string, page: unknown) => page }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/share/OwnShareSheet", () => ({ OwnShareButton: ({ refId }: { refId: string }) => <button>{`propio:${refId}`}</button> }));
vi.mock("@/components/share/ShareAction", () => ({ ShareAction: ({ refId }: { refId: string }) => <button>{`publico:${refId}`}</button> }));

import UserDiscographyPage from "./page";

const ARTIST = "10000000-0000-4000-8000-000000000001";
const disc = (n: number, stars: number, detailedScore: number | null = null) => ({ id: `d${n}`, title: `Disco ${n}`, year: 1980 + n, coverThumbUrl: null, stars, detailedScore });
const track = (number: number, score: { stars: number; detailedScore: number | null } | null) => ({ number, recordingId: `r${number}`, title: `Canción ${number}`, score });
const songDisc = (n: number, tracks: ReturnType<typeof track>[]) => ({ ...disc(n, 4), score: { stars: 4, detailedScore: null }, tracks });
const lamina = (over = {}) => ({
  owner: { id: "u1", username: "ana", displayName: null },
  artist: { id: ARTIST, name: "Banda" },
  discs: [disc(1, 4.5, 86), disc(2, 4), disc(3, 3)],
  songDiscs: [songDisc(1, [track(1, { stars: 5, detailedScore: 97 }), track(2, null)]), songDisc(2, [track(1, { stars: 3.5, detailedScore: null })])],
  ownerDiscs: [],
  available: { disc: true, song: false },
  preference: { sections: [], view: "disc" },
  view: "disc",
  progress: { kind: "rated", count: 3 },
  missing: 0,
  isOwner: false,
  shared: false,
  ...over,
});

const render = async (search: { vista?: string; disco?: string; valorar?: string } = {}) =>
  renderWithIntl(await UserDiscographyPage({ params: Promise.resolve({ username: "ana", id: ARTIST }), searchParams: Promise.resolve(search) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.lamina.mockResolvedValue(lamina());
});

describe("discografía de una persona", () => {
  it("responde 404 si quien mira no la puede ver", async () => {
    mocks.lamina.mockResolvedValue(null);
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("muestra cada nota real: el número si existe y, si no, las estrellas", async () => {
    await render();
    expect(screen.getByText("86")).toBeTruthy();
    expect(screen.getByText("4★")).toBeTruthy();
  });

  it("sin Recorrido dice cuántos discos valoró, sin total", async () => {
    await render();
    expect(screen.getByText("3 discos valorados")).toBeTruthy();
  });

  it("con Recorrido, la barra sin números", async () => {
    mocks.lamina.mockResolvedValue(lamina({ progress: { kind: "journey", percent: 50 } }));
    await render();
    expect(screen.getByRole("img", { name: /a la mitad/ })).toBeTruthy();
    expect(screen.queryByText(/de \d+/)).toBeNull();
  });

  it("el dueño comparte con el gesto", async () => {
    mocks.lamina.mockResolvedValue(lamina({ isOwner: true }));
    await render();
    expect(screen.getByRole("button", { name: `propio:u1.${ARTIST}` })).toBeTruthy();
  });

  it("una seguidora sin marca no tiene botón; con marca, el público", async () => {
    await render();
    expect(screen.queryByRole("button")).toBeNull();
    mocks.lamina.mockResolvedValue(lamina({ shared: true }));
    await render();
    expect(screen.getByRole("button", { name: `publico:u1.${ARTIST}` })).toBeTruthy();
  });

  it("sin las dos vistas no ofrece el selector", async () => {
    await render();
    expect(screen.queryByRole("navigation", { name: "Vista" })).toBeNull();
  });

  it("con las dos vistas, la pedida se muestra como tabla", async () => {
    mocks.lamina.mockResolvedValue(lamina({ available: { disc: true, song: true } }));
    await render({ vista: "canciones" });
    expect(screen.getByRole("link", { name: "Por canción" })).toHaveAttribute("aria-current", "page");
    const table = screen.getByRole("table", { name: "Notas por canción de Banda" });
    expect(table).toBeTruthy();
    expect(screen.getByText("97")).toBeTruthy();
    expect(screen.getAllByText("Sin nota").length).toBeGreaterThan(0);
  });

  it("una vista que no está disponible cae a la otra", async () => {
    await render({ vista: "canciones" });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("86")).toBeTruthy();
  });

  it("los ajustes son solo del dueño", async () => {
    await render();
    expect(screen.queryByText("ajustes")).toBeNull();
    mocks.lamina.mockResolvedValue(lamina({ isOwner: true }));
    await render();
    expect(screen.getByText("ajustes")).toBeTruthy();
  });

  it("la Lámina de álbum muestra cada pista con su nota", async () => {
    const base = lamina({ shared: true });
    mocks.album.mockResolvedValue({ lamina: base, disc: base.songDiscs[0], missing: 0 });
    await render({ disco: "d1" });
    expect(mocks.album).toHaveBeenCalledWith("ana", ARTIST, "d1", null);
    expect(screen.getByRole("link", { name: "Canción 1" })).toBeTruthy();
    expect(screen.getByText("97")).toBeTruthy();
    expect(screen.getByText("Sin nota")).toBeTruthy();
    expect(screen.getByRole("button", { name: `publico:u1.${ARTIST}.d1` })).toBeTruthy();
  });

  it("un álbum que no se puede ver responde 404", async () => {
    mocks.album.mockResolvedValue(null);
    await expect(render({ disco: "d9" })).rejects.toThrow("NOT_FOUND");
  });

  describe("valora lo que falta", () => {
    const unratedDisc = { id: "d9", title: "Sin nota", year: 1999, coverThumbUrl: null, score: null, tracks: [] };

    it("el dueño ve la entrada y, en el modo, cada disco sin nota con sus estrellas", async () => {
      mocks.lamina.mockResolvedValue(lamina({ isOwner: true, ownerDiscs: [unratedDisc] }));
      await render();
      expect(screen.getByRole("link", { name: "Valora lo que falta (1)" })).toHaveAttribute("href", `/users/ana/artist/${ARTIST}?valorar=1`);
      await render({ valorar: "1" });
      expect(screen.getByText("valorar:release-group:Sin nota")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Canciones" })).toHaveAttribute("href", `/users/ana/artist/${ARTIST}?disco=d9`);
    });

    it("una visitante ignora el modo y no ve controles", async () => {
      await render({ valorar: "1" });
      expect(screen.queryByText(/valorar:/)).toBeNull();
      expect(screen.getByText("86")).toBeTruthy();
    });

    it("en el álbum, el dueño valora las canciones sin nota", async () => {
      const base = lamina({ isOwner: true });
      mocks.album.mockResolvedValue({ lamina: base, disc: base.songDiscs[0], missing: 0 });
      await render({ disco: "d1" });
      expect(screen.getByText("valorar:recording:Canción 2")).toBeTruthy();
    });
  });

  describe("arma la tuya", () => {
    it("sin sesión lleva al registro con la intención de discografía", async () => {
      mocks.lamina.mockResolvedValue(lamina({ shared: true }));
      await render();
      expect(screen.getByRole("link", { name: "Arma la tuya" })).toHaveAttribute("href", `/auth/register?discografia=${ARTIST}`);
      expect(screen.getByText("¿Y tu discografía de Banda?")).toBeTruthy();
    });

    it("con sesión lleva a la propia, en el modo para valorar", async () => {
      mocks.session.mockResolvedValue({ user: { id: "u2", username: "leo" } });
      await render();
      expect(screen.getByRole("link", { name: "Arma la tuya" })).toHaveAttribute("href", `/users/leo/artist/${ARTIST}?valorar=1`);
    });

    it("el dueño no lo ve", async () => {
      mocks.lamina.mockResolvedValue(lamina({ isOwner: true }));
      await render();
      expect(screen.queryByRole("link", { name: "Arma la tuya" })).toBeNull();
    });
  });

  describe("armar tier list", () => {
    it("el dueño tiene el botón con discos a la vista", async () => {
      mocks.lamina.mockResolvedValue(lamina({ isOwner: true, ownerDiscs: [disc(1, 4)] }));
      await render();
      expect(screen.getByRole("button", { name: "tier list de Banda" })).toBeInTheDocument();
    });

    it("sin discos, no", async () => {
      mocks.lamina.mockResolvedValue(lamina({ isOwner: true, ownerDiscs: [] }));
      await render();
      expect(screen.queryByRole("button", { name: "tier list de Banda" })).toBeNull();
    });

    it("quien mira la ajena no lo ve", async () => {
      mocks.lamina.mockResolvedValue(lamina({ ownerDiscs: [disc(1, 4)] }));
      await render();
      expect(screen.queryByRole("button", { name: "tier list de Banda" })).toBeNull();
    });
  });

  it("al dueño le dice cuánto falta y no ofrece compartir", async () => {
    mocks.lamina.mockResolvedValue(lamina({ isOwner: true, missing: 1, discs: [disc(1, 4), disc(2, 3)] }));
    await render();
    expect(screen.getByText(/Te falta 1 disco valorado/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
