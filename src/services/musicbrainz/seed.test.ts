import { describe, expect, it } from "vitest";
import { musicbrainzEventCreateUrl } from "./seed";

// Enlace de alta precargado en MusicBrainz (openspec: add-shared-concerts-phase3).

describe("musicbrainzEventCreateUrl", () => {
  it("precarga nombre, tipo, fecha de un día y la fuente", () => {
    const url = new URL(
      musicbrainzEventCreateUrl({
        name: "Los Bunkers en Teatro Caupolicán",
        eventDate: "2009-05-07",
        setlistfmUrl: "https://www.setlist.fm/setlist/los-bunkers/2009/x.html",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://musicbrainz.org/event/create");
    const p = url.searchParams;
    expect(p.get("edit-event.name")).toBe("Los Bunkers en Teatro Caupolicán");
    expect(p.get("edit-event.type_id")).toBe("1");
    expect([p.get("edit-event.period.begin_date.year"), p.get("edit-event.period.begin_date.month"), p.get("edit-event.period.begin_date.day")]).toEqual(["2009", "5", "7"]);
    expect(p.get("edit-event.period.end_date.day")).toBe("7");
    expect(p.get("edit-event.period.ended")).toBe("1");
    expect(p.get("edit-event.edit_note")).toBe("Setlist: https://www.setlist.fm/setlist/los-bunkers/2009/x.html");
  });

  it("sin setlist no hay nota", () => {
    expect(new URL(musicbrainzEventCreateUrl({ name: "x", eventDate: "2020-01-01" })).searchParams.has("edit-event.edit_note")).toBe(false);
  });
});
