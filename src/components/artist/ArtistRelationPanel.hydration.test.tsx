import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import catalogEs from "../../../messages/es/catalog.json";
import { ArtistRelationPanel, type ArtistRelationState } from "./ArtistRelationPanel";

// La fecha relativa de la última escucha no debe desajustar la hidratación: el servidor y el
// primer render del cliente usan el mismo `now` de la request, y después de montar se usa la hora
// real (una escucha recién registrada es posterior a ese `now`).

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api/catalog", () => ({ followArtist: vi.fn(), unfollowArtist: vi.fn() }));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: vi.fn() }));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: vi.fn() }));
vi.mock("@/lib/api/want-to-listen", () => ({ toggleWantToListen: vi.fn() }));
vi.mock("@/components/diary/ListenEntryForm", () => ({ ListenEntryForm: () => null }));
vi.mock("@/components/album/AlbumListPicker", () => ({ AlbumListPicker: () => null }));
vi.mock("@/components/artist-journey/ArtistJourneyStartModal", () => ({ ArtistJourneyStartModal: () => null }));

const REQUEST_NOW = new Date("2026-09-29T12:00:00Z");
const LAST_LISTEN = "2026-09-27T12:00:00Z";

const state: ArtistRelationState = {
  following: true,
  favorited: false,
  pending: false,
  listens: { albumCount: 2, last: { title: "Too Fast for Love", at: LAST_LISTEN } },
  collection: { have: 0, seeking: 0 },
  ownListMemberships: [],
  journey: null,
};

function panel() {
  return (
    <NextIntlClientProvider locale="es" messages={{ catalog: catalogEs }} now={REQUEST_NOW} timeZone="UTC">
      <ArtistRelationPanel
        artistId="a1"
        artistName="Mötley Crüe"
        state={state}
        journeyAlbums={[]}
        categoryLabels={{ studio: "Estudio", single_ep: "Sencillos", compilation: "Recopilatorios", live_other: "En vivo" }}
      />
    </NextIntlClientProvider>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("fecha relativa de la última escucha", () => {
  it("el render del servidor usa el now de la request, no la hora del sistema", () => {
    // El reloj del proceso va 5 minutos adelantado respecto de la request: con `new Date()` el
    // texto del servidor y el del cliente diferían.
    vi.useFakeTimers({ now: new Date("2026-09-29T12:05:00Z"), toFake: ["Date"] });
    expect(renderToString(panel())).toContain("Too Fast for Love, hace 2 días");
  });

  it("después de montar usa la hora real", () => {
    vi.useFakeTimers({ now: new Date("2026-10-06T12:00:00Z"), toFake: ["Date"] });
    render(panel());
    expect(screen.getByText(/Too Fast for Love, hace 1 semana/)).toBeInTheDocument();
  });
});
