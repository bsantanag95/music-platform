import { describe, it, expect } from "vitest";
import { feedEntryTier, isFeedEntryQuote } from "./feed-entry-tier";
import type { FeedEntry } from "@/lib/api/schemas";

const author = { id: "u1", username: "fran", displayName: "Fran" };
const album = { type: "release-group" as const, id: "rg1", title: "Currents", artistName: "Tame Impala", coverThumbUrl: null };
const song = { type: "recording" as const, id: "rec1", title: "Let It Happen", artistName: "Tame Impala", coverThumbUrl: null };

function comment(): FeedEntry {
  return { kind: "comment", id: "c1", body: "Un discazo", createdAt: "2026-08-01T00:00:00Z", target: album, author };
}
function review(): FeedEntry {
  return { kind: "review", id: "rv1", title: "Sobre Currents", body: "...", createdAt: "2026-08-01T00:00:00Z", target: album, author };
}
function listen(body: string | null): FeedEntry {
  return {
    kind: "listen", id: "l1", listenContext: "first_listen", body, reaction: null, audience: "public",
    createdAt: "2026-08-01T00:00:00Z", target: { ...album, subtitle: null }, author,
  };
}
function rating(target: typeof album | typeof song): FeedEntry {
  return { kind: "rating", id: "r1", stars: "4.0", detailedScore: null, createdAt: "2026-08-01T00:00:00Z", target, author };
}
function favorite(targetType: "release-group" | "recording" | "artist"): FeedEntry {
  return {
    kind: "favorite", id: "f1", targetType, audience: "public", createdAt: "2026-08-01T00:00:00Z",
    target: { id: "x", title: "X", artistName: null, coverThumbUrl: null }, author,
  };
}
function listEvent(): FeedEntry {
  return {
    kind: "list", id: "li1", event: "created", audience: "public", createdAt: "2026-08-01T00:00:00Z",
    list: { id: "list1", title: "Best of", entityType: "release-group" }, author,
  };
}

describe("feedEntryTier", () => {
  it("comentario, reseña, evento de lista y escucha con nota → tier 1", () => {
    expect(feedEntryTier(comment())).toBe(1);
    expect(feedEntryTier(review())).toBe(1);
    expect(feedEntryTier(listEvent())).toBe(1);
    expect(feedEntryTier(listen("me voló"))).toBe(1);
  });

  it("rating y favorito de álbum → tier 2", () => {
    expect(feedEntryTier(rating(album))).toBe(2);
    expect(feedEntryTier(favorite("release-group"))).toBe(2);
  });

  it("rating de canción, favorito de canción/artista, escucha sin nota → tier 3", () => {
    expect(feedEntryTier(rating(song))).toBe(3);
    expect(feedEntryTier(favorite("recording"))).toBe(3);
    expect(feedEntryTier(favorite("artist"))).toBe(3);
    expect(feedEntryTier(listen(null))).toBe(3);
    expect(feedEntryTier(listen("   "))).toBe(3);
  });
});

describe("isFeedEntryQuote", () => {
  it("true solo para comentario, reseña y escucha con nota", () => {
    expect(isFeedEntryQuote(comment())).toBe(true);
    expect(isFeedEntryQuote(review())).toBe(true);
    expect(isFeedEntryQuote(listen("nota"))).toBe(true);
  });
  it("false para evento de lista, escucha sin nota, rating y favorito", () => {
    expect(isFeedEntryQuote(listEvent())).toBe(false);
    expect(isFeedEntryQuote(listen(null))).toBe(false);
    expect(isFeedEntryQuote(rating(album))).toBe(false);
    expect(isFeedEntryQuote(favorite("release-group"))).toBe(false);
  });
});
