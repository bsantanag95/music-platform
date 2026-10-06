import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PopularCommentsTabs } from "./PopularCommentsTabs";
import type { PopularComment, PopularCommentsByType } from "@/services/home/home";

vi.mock("next-intl", () => ({ useLocale: () => "es" }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

const comment = (id: string, likeCount: number | null): PopularComment => ({
  id,
  body: `texto ${id}`,
  likeCount,
  authorUsername: "ana",
  authorDisplayName: null,
  target: { type: "release-group", id: `rg-${id}`, title: `Disco ${id}`, coverThumbUrl: null },
  stars: null,
  detailedScore: null,
});

const byType = (rows: PopularComment[]): PopularCommentsByType => ({ artist: [], "release-group": rows, recording: [] });

const props = {
  tablistLabel: "Comentarios populares",
  tabLabels: { artist: "Artistas", "release-group": "Álbumes", recording: "Canciones" },
  emptyText: "Vacío",
  likeWord: "me gusta",
};

describe("PopularCommentsTabs", () => {
  it("muestra la pill ♡ N solo cuando hay cifra visible", () => {
    render(<PopularCommentsTabs {...props} comments={byType([comment("a", 5), comment("b", null)])} />);
    expect(screen.getByLabelText("5 me gusta")).toHaveTextContent("♡ 5");
    expect(screen.queryAllByLabelText(/me gusta/)).toHaveLength(1);
  });
});
