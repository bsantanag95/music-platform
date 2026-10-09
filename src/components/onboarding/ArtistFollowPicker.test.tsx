import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import onboardingEs from "../../../messages/es/onboarding.json";
import { ArtistFollowPicker } from "./ArtistFollowPicker";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  getSearchSuggestions: vi.fn(),
  followArtist: vi.fn(),
  unfollowArtist: vi.fn(),
}));
vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
  getSearchSuggestions: mocks.getSearchSuggestions,
  followArtist: mocks.followArtist,
  unfollowArtist: mocks.unfollowArtist,
}));

const radioheadId = "a1b2c3d4-0000-4000-8000-000000000080";
const radioheadTributeId = "a1b2c3d4-0000-4000-8000-000000000081";

function artistResult(id: string, name: string, disambiguation: string | null) {
  return {
    kind: "artist" as const,
    id,
    mbid: null,
    name,
    disambiguation,
    artistType: "group" as const,
    country: null,
    cached: true,
    exact: false,
  };
}

const response = {
  type: "artist" as const,
  remoteFailed: false,
  results: [artistResult(radioheadId, "Radiohead", "rock británico"), artistResult(radioheadTributeId, "Radiohead Tribute", null)],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSearchSuggestions.mockResolvedValue({ suggestions: [] });
  mocks.searchArtists.mockResolvedValue(response);
  mocks.followArtist.mockResolvedValue({ following: true });
  mocks.unfollowArtist.mockResolvedValue({ following: false });
});

describe("ArtistFollowPicker", () => {
  it("sigue al artista elegido, lo lista aparte y lo saca de los resultados", async () => {
    const onCount = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ArtistFollowPicker onCountChange={onCount} />);

    await user.type(screen.getByRole("searchbox"), "radiohead");
    await user.click(await screen.findByRole("button", { name: /rock británico/ }));

    await waitFor(() => expect(mocks.followArtist).toHaveBeenCalledWith(radioheadId));
    expect(await screen.findByRole("button", { name: "Dejar de seguir a Radiohead" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rock británico/ })).not.toBeInTheDocument();
    expect(screen.getByText("Sigues a 1 artista")).toBeInTheDocument();
    expect(onCount).toHaveBeenLastCalledWith(1);
  });

  it("al seguir limpia el texto y devuelve el foco al campo", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistFollowPicker />);

    const input = screen.getByRole("searchbox");
    await user.type(input, "radiohead");
    await user.click(await screen.findByRole("button", { name: /rock británico/ }));

    await screen.findByRole("button", { name: "Dejar de seguir a Radiohead" });
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("sigue una sola vez aunque se haga clic dos veces seguidas", async () => {
    let resolveFollow: (value: { following: true }) => void = () => {};
    mocks.followArtist.mockReturnValue(new Promise((resolve) => (resolveFollow = resolve)));
    const user = userEvent.setup();
    renderWithIntl(<ArtistFollowPicker />);

    await user.type(screen.getByRole("searchbox"), "radiohead");
    const row = await screen.findByRole("button", { name: /rock británico/ });
    await user.click(row);
    await user.click(row);
    resolveFollow({ following: true });

    await screen.findByRole("button", { name: "Dejar de seguir a Radiohead" });
    expect(mocks.followArtist).toHaveBeenCalledTimes(1);
  });

  it("deja de seguir y devuelve el artista a los resultados", async () => {
    const onCount = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(<ArtistFollowPicker onCountChange={onCount} />);

    await user.type(screen.getByRole("searchbox"), "radiohead");
    await user.click(await screen.findByRole("button", { name: /rock británico/ }));
    await user.click(await screen.findByRole("button", { name: "Dejar de seguir a Radiohead" }));

    await waitFor(() => expect(mocks.unfollowArtist).toHaveBeenCalledWith(radioheadId));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Dejar de seguir a Radiohead" })).not.toBeInTheDocument(),
    );
    expect(onCount).toHaveBeenLastCalledWith(0);
    expect(screen.getByText("Todavía no sigues a nadie")).toBeInTheDocument();
  });

  it("si seguir falla, muestra el error y no lista al artista", async () => {
    mocks.followArtist.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithIntl(<ArtistFollowPicker />);

    await user.type(screen.getByRole("searchbox"), "radiohead");
    await user.click(await screen.findByRole("button", { name: /rock británico/ }));

    expect(await screen.findByText(onboardingEs.error)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dejar de seguir a Radiohead" })).not.toBeInTheDocument();
  });

  it("un fallo de búsqueda se dice como error, no como «Sin resultados»", async () => {
    mocks.searchArtists.mockRejectedValue(new Error("boom"));
    mocks.getSearchSuggestions.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderWithIntl(<ArtistFollowPicker />);

    await user.type(screen.getByRole("searchbox"), "radiohead");

    expect(await screen.findByText(onboardingEs.searchError)).toBeInTheDocument();
    expect(screen.queryByText(onboardingEs.artists.noResults)).not.toBeInTheDocument();
  });
});
