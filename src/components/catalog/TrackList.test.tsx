import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { TrackList } from "./TrackList";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import catalogEn from "../../../messages/en/catalog.json";
import type { AlbumTrack } from "@/services/catalog/album-detail";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createListenEntry: vi.fn(),
  updateListenEntry: vi.fn(),
  toggleFavorite: vi.fn(),
  getRatings: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  updateListenEntry: mocks.updateListenEntry,
}));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: mocks.toggleFavorite }));
vi.mock("@/lib/api/social", () => ({ getRatings: mocks.getRatings }));
vi.mock("@/components/diary/ListenEntryForm", () => ({ ListenEntryForm: () => <div>formulario de escucha</div> }));

const tracksEs = catalogEs.album.tracks;
const ALBUM_ARTIST = "artist-album";

function makeTrack(discNumber: number, position: number, title: string, overrides: Partial<AlbumTrack> = {}): AlbumTrack {
  return {
    recordingId: `rec-${discNumber}-${position}`,
    discNumber,
    position,
    title,
    durationSec: 200,
    credits: [{ artistId: ALBUM_ARTIST, name: "Pink Floyd", role: "primary", joinPhrase: null }],
    variantType: "original",
    variantOf: null,
    ...overrides,
  };
}

function renderList(tracks: AlbumTrack[], props: Partial<React.ComponentProps<typeof TrackList>> = {}, locale: "es" | "en" = "es") {
  return renderWithIntl(
    <TrackList
      releaseGroupId="rg-1"
      tracks={tracks}
      albumArtistIds={[ALBUM_ARTIST]}
      editionLabel="standard"
      editionsAvailable={false}
      authenticated={false}
      communityFavoriteIds={[]}
      listenedIds={[]}
      favoriteIds={[]}
      {...props}
    />,
    locale,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("TrackList", () => {
  it("muestra posición, título completo enlazado, duración y la edición mostrada", () => {
    const longTitle = "The Great Gig in the Sky (Instrumental Version With Vocal Improvisation, 2011 Remaster)";
    renderList([makeTrack(1, 1, "Breathe", { durationSec: 163 }), makeTrack(1, 2, longTitle)]);

    expect(screen.getByRole("heading", { name: tracksEs.heading })).toBeInTheDocument();
    expect(screen.getByText("Edición mostrada: Estándar")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: longTitle });
    expect(link).toHaveAttribute("href", "/song/rec-1-2");
    expect(link.className).not.toContain("truncate");
    expect(screen.getAllByText("2:43").length).toBeGreaterThan(0);
  });

  it("agrupa por disco con subtotales y total al pie", () => {
    renderList([
      makeTrack(1, 1, "Uno", { durationSec: 60 }),
      makeTrack(1, 2, "Dos", { durationSec: 60 }),
      makeTrack(2, 1, "Tres", { durationSec: 90 }),
    ]);

    expect(screen.getByRole("heading", { name: "Disco 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Disco 2" })).toBeInTheDocument();
    expect(screen.getByText("2 pistas · 2:00")).toBeInTheDocument();
    expect(screen.getByText("1 pista · 1:30")).toBeInTheDocument();
    expect(screen.getByText("3 pistas")).toBeInTheDocument();
    expect(screen.getByText("3:30")).toBeInTheDocument();
  });

  it("no muestra encabezados de disco con un solo disco", () => {
    renderList([makeTrack(1, 1, "Uno")]);
    expect(screen.queryByRole("heading", { name: "Disco 1" })).not.toBeInTheDocument();
  });

  it("marca el total como mínimo cuando falta alguna duración", () => {
    renderList([makeTrack(1, 1, "Uno", { durationSec: 100 }), makeTrack(1, 2, "Dos", { durationSec: null })]);
    expect(screen.getByText("≥ 1:40")).toBeInTheDocument();
    expect(screen.getAllByText(catalogEs.album.durationUnknown).length).toBeGreaterThan(0);
  });

  it("muestra el artista de una pista cuando no es el del álbum, sin presentarlo como feat.", () => {
    renderList([
      makeTrack(1, 1, "Us and Them", {
        credits: [{ artistId: "otro", name: "Otro Artista", role: "primary", joinPhrase: null }],
      }),
    ]);
    const link = screen.getByRole("link", { name: "Otro Artista" });
    expect(link).toHaveAttribute("href", "/artist/otro");
    expect(screen.queryByText(new RegExp(`${catalogEs.album.creditsLabel}:`))).not.toBeInTheDocument();
  });

  it("no repite el artista del álbum en sus pistas", () => {
    renderList([makeTrack(1, 1, "Time")]);
    expect(screen.queryByRole("link", { name: "Pink Floyd" })).not.toBeInTheDocument();
  });

  it("muestra los créditos destacados como enlaces", () => {
    renderList([
      makeTrack(1, 1, "Money", {
        credits: [
          { artistId: ALBUM_ARTIST, name: "Pink Floyd", role: "primary", joinPhrase: " feat. " },
          { artistId: "feat-1", name: "Invitado Uno", role: "featured", joinPhrase: " & " },
          { artistId: "feat-2", name: "Invitado Dos", role: "featured", joinPhrase: null },
        ],
      }),
    ]);
    expect(screen.getByRole("link", { name: "Invitado Uno" })).toHaveAttribute("href", "/artist/feat-1");
    expect(screen.getByRole("link", { name: "Invitado Dos" })).toHaveAttribute("href", "/artist/feat-2");
  });

  it("etiqueta una variante en vivo y enlaza a la original", () => {
    renderList([
      makeTrack(1, 1, "Money", { variantType: "live", variantOf: { recordingId: "rec-orig", title: "Money" } }),
    ]);
    expect(screen.getByText(tracksEs.variant.live)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "versión de Money" })).toHaveAttribute("href", "/song/rec-orig");
  });

  it("marca las favoritas de la comunidad y, con sesión, las pistas escuchadas", () => {
    renderList([makeTrack(1, 1, "Uno"), makeTrack(1, 2, "Dos")], {
      authenticated: true,
      communityFavoriteIds: ["rec-1-1"],
      listenedIds: ["rec-1-2"],
    });
    expect(screen.getAllByText(tracksEs.communityFavorite).length).toBeGreaterThan(0);
    expect(screen.getAllByText(tracksEs.youListened).length).toBeGreaterThan(0);
  });

  it("no muestra marcas personales sin sesión", () => {
    renderList([makeTrack(1, 1, "Uno")], { listenedIds: ["rec-1-1"] });
    expect(screen.queryByText(tracksEs.youListened)).not.toBeInTheDocument();
  });

  it("ordena el menú con las acciones de consumo primero", () => {
    renderList([makeTrack(1, 1, "Uno")], { authenticated: true });
    fireEvent.click(screen.getByRole("button", { name: "Acciones de Uno" }));
    const items = within(screen.getByRole("menu")).getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual([
      tracksEs.menu.logListen,
      tracksEs.menu.react,
      tracksEs.menu.rate,
      tracksEs.menu.favorite,
      tracksEs.menu.addToList,
      tracksEs.menu.showInLists,
      tracksEs.menu.goToSong,
    ]);
  });

  it("sin sesión, registrar una escucha pide iniciar sesión y no crea nada", () => {
    renderList([makeTrack(1, 1, "Uno")]);
    fireEvent.click(screen.getByRole("button", { name: "Acciones de Uno" }));
    fireEvent.click(screen.getByRole("menuitem", { name: tracksEs.menu.logListen }));
    expect(mocks.push).toHaveBeenCalledWith("/auth/login");
    expect(mocks.createListenEntry).not.toHaveBeenCalled();
  });

  it("con sesión, registrar una escucha marca la pista como escuchada", async () => {
    mocks.createListenEntry.mockResolvedValue({
      id: "entry-1",
      target: { type: "recording", id: "rec-1-1", title: "Uno" },
      listenContext: "first_listen",
      body: null,
      reaction: null,
      audience: "private",
    });
    renderList([makeTrack(1, 1, "Uno")], { authenticated: true });
    fireEvent.click(screen.getByRole("button", { name: "Acciones de Uno" }));
    fireEvent.click(screen.getByRole("menuitem", { name: tracksEs.menu.logListen }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(tracksEs.logged));
    expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "recording", id: "rec-1-1" });
    expect(screen.getAllByText(tracksEs.youListened).length).toBeGreaterThan(0);
  });

  it("usa las etiquetas del idioma activo", () => {
    renderList([makeTrack(1, 1, "Uno")], {}, "en");
    expect(screen.getByRole("heading", { name: catalogEn.album.tracks.heading })).toBeInTheDocument();
  });
});
