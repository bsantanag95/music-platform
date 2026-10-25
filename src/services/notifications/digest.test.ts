import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationGroup } from "./read";
import { DIGEST_SECTION_LIMIT, buildDigest } from "./digest";

const mocks = vi.hoisted(() => ({ listNotificationGroups: vi.fn() }));

vi.mock("./read", () => ({ listNotificationGroups: mocks.listNotificationGroups }));

const windowStart = new Date("2026-10-19T00:00:00.000Z");
const windowEnd = new Date("2026-10-26T00:00:00.000Z");

function group(overrides: Partial<NotificationGroup> = {}): NotificationGroup {
  return {
    id: "thread:root",
    kind: "comment_reply",
    lastAt: "2026-10-22T10:00:00.000Z",
    unread: true,
    eventCount: 1,
    actorCount: 1,
    actors: [],
    target: null,
    ...overrides,
  };
}

function page(groups: NotificationGroup[], nextCursor: string | null = null) {
  return { groups, nextCursor };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listNotificationGroups.mockResolvedValue(page([]));
});

describe("buildDigest", () => {
  it("se queda con lo no leído dentro de la ventana de las dos pestañas", async () => {
    mocks.listNotificationGroups.mockImplementation(
      async (_userId: string, options: { tab: string }) =>
        options.tab === "for_you"
          ? page([
              group({ id: "a", lastAt: "2026-10-25T09:00:00.000Z" }),
              group({ id: "b", unread: false }),
              group({ id: "c", lastAt: "2026-10-19T00:00:00.000Z" }),
            ])
          : page([group({ id: "d", kind: "artist_release" })]),
    );

    const digest = await buildDigest("me", windowStart, windowEnd, {
      timeZone: "America/Santiago",
    });

    expect(digest.forYou.entries.map((entry) => entry.id)).toEqual(["a"]);
    expect(digest.releases.entries.map((entry) => entry.id)).toEqual(["d"]);
    expect(digest.total).toBe(2);
    // La misma zona que la bandeja, para que los grupos de seguidores coincidan.
    expect(mocks.listNotificationGroups).toHaveBeenCalledWith(
      "me",
      expect.objectContaining({ tab: "for_you", timeZone: "America/Santiago" }),
    );
    expect(mocks.listNotificationGroups).toHaveBeenCalledWith(
      "me",
      expect.objectContaining({ tab: "releases", timeZone: "America/Santiago" }),
    );
  });

  it("una semana sin nada sin leer no arma resumen", async () => {
    mocks.listNotificationGroups.mockResolvedValue(page([]));

    const digest = await buildDigest("me", windowStart, windowEnd);

    expect(digest.total).toBe(0);
    expect(digest.forYou.entries).toEqual([]);
    expect(digest.releases.entries).toEqual([]);
  });

  it("todo leído tampoco arma resumen", async () => {
    mocks.listNotificationGroups.mockResolvedValue(
      page([group({ unread: false }), group({ id: "b", unread: false })]),
    );

    const digest = await buildDigest("me", windowStart, windowEnd);

    expect(digest.total).toBe(0);
  });

  it("recorre páginas y corta al llegar a una entrada anterior a la ventana", async () => {
    mocks.listNotificationGroups.mockImplementation(
      async (_userId: string, options: { tab: string; cursor?: string | null }) => {
        if (options.tab !== "for_you") return page([]);
        if (!options.cursor) {
          return page(
            [
              group({ id: "a", lastAt: "2026-10-25T09:00:00.000Z" }),
              group({ id: "b", lastAt: "2026-10-24T09:00:00.000Z" }),
            ],
            "cursor-1",
          );
        }
        return page([
          group({ id: "c", lastAt: "2026-10-20T09:00:00.000Z" }),
          group({ id: "vieja", lastAt: "2026-10-18T09:00:00.000Z" }),
        ]);
      },
    );

    const digest = await buildDigest("me", windowStart, windowEnd);

    expect(digest.forYou.entries.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
    expect(digest.forYou.total).toBe(3);
    // No pide la página siguiente después de cruzar la ventana.
    const forYouCalls = mocks.listNotificationGroups.mock.calls.filter(
      ([, options]) => (options as { tab: string }).tab === "for_you",
    );
    expect(forYouCalls).toHaveLength(2);
  });

  it("recorre la página siguiente mientras no llegue a la ventana", async () => {
    mocks.listNotificationGroups.mockImplementation(
      async (_userId: string, options: { tab: string; cursor?: string | null }) => {
        if (options.tab !== "for_you") return page([]);
        return options.cursor === "cursor-1"
          ? page([group({ id: "b" })], null)
          : page([group({ id: "a" })], "cursor-1");
      },
    );

    const digest = await buildDigest("me", windowStart, windowEnd);

    expect(digest.forYou.entries.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect(mocks.listNotificationGroups).toHaveBeenCalledWith(
      "me",
      expect.objectContaining({ tab: "for_you", cursor: "cursor-1" }),
    );
  });

  it("limita cada sección y cuenta el resto como «y N más»", async () => {
    const many = Array.from({ length: DIGEST_SECTION_LIMIT + 3 }, (_, index) =>
      group({ id: `g${index}` }),
    );
    mocks.listNotificationGroups.mockResolvedValue(page(many));

    const digest = await buildDigest("me", windowStart, windowEnd);

    expect(digest.forYou.entries).toHaveLength(DIGEST_SECTION_LIMIT);
    expect(digest.forYou.more).toBe(3);
    expect(digest.forYou.total).toBe(DIGEST_SECTION_LIMIT + 3);
  });

  it("una entrada con fecha futura no entra (la ventana cierra en `windowEnd`)", async () => {
    mocks.listNotificationGroups.mockResolvedValue(
      page([
        group({ id: "futura", lastAt: "2026-10-27T09:00:00.000Z" }),
        group({ id: "dentro", lastAt: "2026-10-25T09:00:00.000Z" }),
      ]),
    );

    const digest = await buildDigest("me", windowStart, windowEnd);

    expect(digest.forYou.entries.map((entry) => entry.id)).toEqual(["dentro"]);
  });
});
