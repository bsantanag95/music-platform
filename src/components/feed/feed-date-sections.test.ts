import { describe, expect, it } from "vitest";
import { dateBucket, withDateSections } from "./feed-date-sections";
import type { FeedRow } from "./feed-grouping";

const now = new Date("2026-10-20T15:00:00Z");
const row = (id: string, createdAt: string) => ({ kind: "rating", id, createdAt }) as unknown as FeedRow;

describe("dateBucket", () => {
  it("separa hoy, últimos 7 días, últimos 30 días y antes", () => {
    expect(dateBucket("2026-10-20T01:00:00Z", now, "UTC")).toBe("today");
    expect(dateBucket("2026-10-19T23:00:00Z", now, "UTC")).toBe("week");
    expect(dateBucket("2026-10-10T00:00:00Z", now, "UTC")).toBe("month");
    expect(dateBucket("2026-08-01T00:00:00Z", now, "UTC")).toBe("earlier");
  });

  it("'hoy' es el día calendario de la zona horaria de la app", () => {
    // 02:00 UTC del 20 son las 23:00 del 19 en Santiago (UTC-3): ayer, no hoy.
    expect(dateBucket("2026-10-20T02:00:00Z", now, "America/Santiago")).toBe("week");
  });
});

describe("withDateSections", () => {
  it("pone un encabezado solo cuando cambia el bloque", () => {
    const rows = [
      row("a", "2026-10-20T10:00:00Z"),
      row("b", "2026-10-17T10:00:00Z"),
      row("c", "2026-10-16T10:00:00Z"),
      row("d", "2026-07-01T10:00:00Z"),
    ];

    const result = withDateSections(rows, now, "UTC").map((item) =>
      item.kind === "date-section" ? `#${item.bucket}` : (item as { id: string }).id,
    );

    expect(result).toEqual(["#today", "a", "#week", "b", "c", "#earlier", "d"]);
  });

  it("al sumar una página que sigue en el mismo bloque no repite el encabezado", () => {
    const page1 = [row("a", "2026-08-02T00:00:00Z")];
    const page2 = [row("b", "2026-08-01T00:00:00Z")];

    const headers = withDateSections([...page1, ...page2], now, "UTC").filter((item) => item.kind === "date-section");

    expect(headers).toHaveLength(1);
  });
});
