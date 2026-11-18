import { describe, expect, it } from "vitest";
import { selectHomeFeedCards } from "./home-feed-cards";
import type { FeedEntry } from "@/services/feed/feed";

type Author = { id: string; username: string; displayName: string | null };
const ana: Author = { id: "ana", username: "ana", displayName: null };
const luis: Author = { id: "luis", username: "luis", displayName: "Luis" };
const target = (id: string) => ({ type: "release-group" as const, id, title: id, artistName: null, artistId: null, albumId: null, albumTitle: null, coverThumbUrl: null, subtitle: null });

let seq = 0;
const at = () => new Date(Date.UTC(2026, 10, 18) - ++seq * 60_000).toISOString();
const listen = (author = ana, id = `l${seq}`): FeedEntry =>
  ({ kind: "listen", id, listenContext: "first_listen", body: null, reaction: null, audience: "public", createdAt: at(), target: target(id), author }) as FeedEntry;
const rating = (author = ana): FeedEntry =>
  ({ kind: "rating", id: `r${seq}`, stars: "4.0", detailedScore: 80, createdAt: at(), target: target(`r${seq}`), author }) as FeedEntry;
const review = (author = ana): FeedEntry =>
  ({ kind: "review", id: `v${seq}`, title: null, body: "Bien", createdAt: at(), target: target(`v${seq}`), author }) as unknown as FeedEntry;
const camino = (author = luis): FeedEntry =>
  ({ kind: "camino", id: `c${seq}`, event: "created", audience: "public", createdAt: at(), camino: { id: "c", title: "C", albumCount: 3 }, author }) as FeedEntry;
const follow = (author = luis): FeedEntry =>
  ({ kind: "follow", id: `f${seq}`, createdAt: at(), followedUser: ana, author }) as FeedEntry;
const favorite = (targetType: "release-group" | "recording", author = ana): FeedEntry =>
  ({ kind: "favorite", id: `fa${seq}`, targetType, audience: "public", createdAt: at(), target: target(`fa${seq}`), author }) as FeedEntry;

// openspec: redesign-signed-in-home-phase2
describe("selectHomeFeedCards", () => {
  it("pone el contenido en tarjetas y resume el resto por persona y tipo", () => {
    const { cards, summary } = selectHomeFeedCards([review(ana), camino(), camino(), follow(), camino(), rating(luis)]);
    expect(cards.map((card) => card.kind)).toEqual(["review", "rating"]);
    expect(summary).toEqual([
      { author: luis, counts: [{ kind: "caminoCreated", count: 3 }, { kind: "follow", count: 1 }] },
    ]);
  });

  it("los favoritos de álbum van en tarjeta; los de canción, al resumen", () => {
    const { cards, summary } = selectHomeFeedCards([favorite("release-group"), favorite("recording")]);
    expect(cards).toHaveLength(1);
    expect(summary[0]!.counts).toEqual([{ kind: "favorite", count: 1 }]);
  });

  it("une las escuchas seguidas de una persona aunque haya eventos resumidos en medio", () => {
    const { cards } = selectHomeFeedCards([listen(ana), follow(luis), listen(ana), listen(ana), listen(luis)]);
    expect(cards.map((card) => card.kind)).toEqual(["listen-run", "listen"]);
    expect(cards[0]!.kind === "listen-run" && cards[0]!.entries).toHaveLength(3);
  });

  it("otra tarjeta corta la racha", () => {
    const { cards } = selectHomeFeedCards([listen(ana), rating(ana), listen(ana)]);
    expect(cards.map((card) => card.kind)).toEqual(["listen", "rating", "listen"]);
  });

  it("se detiene en el límite y no resume lo que queda fuera del tramo", () => {
    const { cards, summary } = selectHomeFeedCards([rating(ana), camino(), rating(ana), camino(), rating(ana)], 2);
    expect(cards).toHaveLength(2);
    expect(summary[0]!.counts).toEqual([{ kind: "caminoCreated", count: 1 }]);
  });

  it("si el feed se acaba antes del límite, resume también lo último", () => {
    const { summary } = selectHomeFeedCards([rating(ana), follow(luis)]);
    expect(summary).toHaveLength(1);
  });

  it("sin entradas de tarjeta devuelve solo el resumen", () => {
    const { cards, summary } = selectHomeFeedCards([camino(), follow()]);
    expect(cards).toEqual([]);
    expect(summary[0]!.counts.map((count) => count.kind)).toEqual(["caminoCreated", "follow"]);
  });
});
