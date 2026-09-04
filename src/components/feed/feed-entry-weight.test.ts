import { describe, it, expect } from "vitest";
import { isFeedEntryWithText } from "./feed-entry-weight";
import type { FeedEntry } from "@/lib/api/schemas";

const author = { id: "u1", username: "fran", displayName: "Fran" };
const target = { type: "release-group" as const, id: "rg1", title: "Currents", coverThumbUrl: null };

function comment(): FeedEntry {
  return { kind: "comment", id: "c1", body: "Un discazo", createdAt: "2026-08-01T00:00:00Z", target, author };
}

function listen(body: string | null): FeedEntry {
  return {
    kind: "listen",
    id: "l1",
    listenContext: "first_listen",
    body,
    reaction: null,
    audience: "public",
    createdAt: "2026-08-01T00:00:00Z",
    target: { ...target, subtitle: null },
    author,
  };
}

function rating(detailedScore: number | null): FeedEntry {
  return { kind: "rating", id: "r1", stars: "4.0", detailedScore, createdAt: "2026-08-01T00:00:00Z", target, author };
}

describe("isFeedEntryWithText", () => {
  it("un comentario siempre es con texto", () => {
    expect(isFeedEntryWithText(comment())).toBe(true);
  });

  it("una escucha con nota escrita es con texto", () => {
    expect(isFeedEntryWithText(listen("Me voló la cabeza"))).toBe(true);
  });

  it("una escucha sin nota o con nota en blanco es de sola presencia", () => {
    expect(isFeedEntryWithText(listen(null))).toBe(false);
    expect(isFeedEntryWithText(listen("   "))).toBe(false);
  });

  it("un rating es de sola presencia aunque tenga score detallado", () => {
    expect(isFeedEntryWithText(rating(null))).toBe(false);
    expect(isFeedEntryWithText(rating(87))).toBe(false);
  });

  it("un favorito y un evento de lista son de sola presencia", () => {
    const favorite: FeedEntry = {
      kind: "favorite",
      id: "f1",
      targetType: "artist",
      audience: "public",
      createdAt: "2026-08-01T00:00:00Z",
      target: { id: "a1", title: "Tame Impala", coverThumbUrl: null },
      author,
    };
    const list: FeedEntry = {
      kind: "list",
      id: "li1",
      event: "created",
      audience: "public",
      createdAt: "2026-08-01T00:00:00Z",
      list: { id: "list1", title: "Best of", entityType: "release-group" },
      author,
    };
    expect(isFeedEntryWithText(favorite)).toBe(false);
    expect(isFeedEntryWithText(list)).toBe(false);
  });
});
