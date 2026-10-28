import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ApiError } from "@/lib/api/client";
import { QuickActionsChangeContext } from "../quick-actions-changes";
import { FollowPanel } from "./FollowPanel";
import type { PickTarget } from "../types";

const mocks = vi.hoisted(() => ({ followArtist: vi.fn() }));

vi.mock("@/lib/api/catalog", () => ({ followArtist: mocks.followArtist }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

const artist: PickTarget = { type: "artist", id: "a1b2c3d4-0000-4000-8000-000000000001", title: "Europe", subtitle: null };

describe("FollowPanel (redesign-artists-toolbar)", () => {
  it("sigue al artista, avisa del cambio y enlaza a los artistas que sigue", async () => {
    mocks.followArtist.mockResolvedValue({ following: true });
    const notify = vi.fn();
    renderWithIntl(
      <QuickActionsChangeContext.Provider value={notify}>
        <FollowPanel target={artist} onReset={() => {}} onNavigate={() => {}} />
      </QuickActionsChangeContext.Provider>,
    );

    expect(await screen.findByText("Sigues a este artista")).toBeInTheDocument();
    expect(screen.getByText("Europe")).toBeInTheDocument();
    expect(mocks.followArtist).toHaveBeenCalledTimes(1);
    expect(mocks.followArtist).toHaveBeenCalledWith(artist.id);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Ver artistas que sigo" })).toHaveAttribute("href", "/me/artists");
  });

  it("si falla lo dice y ofrece elegir otro", async () => {
    mocks.followArtist.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "boom"));
    renderWithIntl(<FollowPanel target={artist} onReset={() => {}} onNavigate={() => {}} />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});
