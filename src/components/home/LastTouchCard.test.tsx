import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { LastTouchCard } from "./LastTouchCard";
import type { FeedListenEntry } from "@/services/feed/feed";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
  ),
  getLocale: vi.fn().mockResolvedValue("es"),
  getFormatter: vi.fn().mockResolvedValue({ relativeTime: () => "hace 5 días" }),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("./RelistenButton", () => ({
  RelistenButton: ({ label, target }: { label: string; target: { title: string } }) => (
    <button type="button" data-target={target.title}>
      {label}
    </button>
  ),
}));

const listen = {
  kind: "listen",
  id: "l1",
  createdAt: "2026-11-12T10:00:00Z",
  target: { type: "release-group", id: "a1", title: "Too Fast for Love", artistName: "Mötley Crüe", coverThumbUrl: null },
} as unknown as FeedListenEntry;

// openspec: redesign-signed-in-home-phase1
describe("LastTouchCard", () => {
  it("muestra título, artista, fecha y tu valoración en forma de fila", async () => {
    renderWithIntl(await LastTouchCard({ entry: listen, rating: { stars: "4.0", detailedScore: 77 } }));
    const card = screen.getByRole("article", { name: "Too Fast for Love" });
    expect(within(card).getByText("Mötley Crüe")).toBeInTheDocument();
    expect(within(card).getByText("hace 5 días")).toBeInTheDocument();
    expect(within(card).getByRole("img", { name: /lastTouchRatingScore/ })).toHaveTextContent("77/100");
    expect(within(card).getByRole("button", { name: "lastTouchRelisten" })).toHaveAttribute("data-target", "Too Fast for Love");
    expect(within(card).getByRole("link", { name: "lastTouchViewAlbum" })).toBeInTheDocument();
  });

  it("sin valoración no muestra estrellas", async () => {
    renderWithIntl(await LastTouchCard({ entry: listen, rating: null }));
    expect(screen.queryByRole("img", { name: /lastTouchRating/ })).not.toBeInTheDocument();
  });

  it("rotula el enlace según el tipo", async () => {
    const song = { ...listen, target: { ...listen.target, type: "recording" } } as FeedListenEntry;
    renderWithIntl(await LastTouchCard({ entry: song, rating: null }));
    expect(screen.getByRole("link", { name: "lastTouchViewSong" })).toBeInTheDocument();
  });
});
