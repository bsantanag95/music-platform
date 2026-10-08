import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { PopularCommentsTabs } from "./PopularCommentsTabs";
import type { PopularComment, PopularCommentsByType } from "@/services/home/home";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));

const artistComment = (topic: PopularComment["topic"]): PopularComment => ({
  id: "c1",
  body: "Empezá por el primero",
  topic,
  likeCount: 4,
  authorUsername: "ana",
  authorDisplayName: null,
  target: { type: "artist", id: "a1", title: "Pink Floyd", coverThumbUrl: null },
  stars: null,
  detailedScore: null,
});

const byType = (artist: PopularComment[]): PopularCommentsByType => ({ artist, "release-group": [], recording: [] });

const props = {
  tablistLabel: "Comentarios populares",
  tabLabels: { artist: "Artistas", "release-group": "Álbumes", recording: "Canciones" },
  emptyText: "Vacío",
  likeWord: "me gusta",
};

describe("PopularCommentsTabs — tema (add-artist-comment-topics)", () => {
  it("un comentario popular de artista muestra su tema", () => {
    renderWithIntl(<PopularCommentsTabs {...props} comments={byType([artistComment("start")])} />);
    expect(screen.getByText("Para empezar")).toBeInTheDocument();
  });

  it("un comentario sin tema no muestra etiqueta", () => {
    renderWithIntl(<PopularCommentsTabs {...props} comments={byType([artistComment(null)])} />);
    expect(screen.queryByText("Para empezar")).not.toBeInTheDocument();
    expect(screen.queryByText("General")).not.toBeInTheDocument();
  });
});
