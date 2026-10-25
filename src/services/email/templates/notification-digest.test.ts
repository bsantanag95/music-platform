import { describe, expect, it } from "vitest";
import type { NotificationGroup } from "@/services/notifications/read";
import type { DigestSection, NotificationDigest } from "@/services/notifications/digest";
import { buildNotificationDigestEmail } from "./notification-digest";

const INBOX = "https://music.example/es/me/notifications";
const UNSUBSCRIBE = "https://music.example/es/notifications/unsubscribe?token=abc.def";
const UNSUBSCRIBE_API = "https://music.example/api/notifications/unsubscribe?token=abc.def";

function reply(overrides: Partial<NotificationGroup> = {}): NotificationGroup {
  return {
    id: "thread:root",
    kind: "comment_reply",
    lastAt: "2026-10-22T10:00:00.000Z",
    unread: true,
    eventCount: 1,
    actorCount: 1,
    actors: [
      {
        id: "00000000-0000-4000-8000-00000000000a",
        username: "ana",
        displayName: "Ana",
        avatarUrl: null,
      },
    ],
    target: {
      type: "artist",
      artistId: "00000000-0000-4000-8000-00000000000b",
      artistName: "Pink Floyd",
      rootId: "00000000-0000-4000-8000-0000000000f1",
    },
    ...overrides,
  };
}

function release(): NotificationGroup {
  return {
    id: "release:1",
    kind: "artist_release",
    lastAt: "2026-10-23T10:00:00.000Z",
    unread: true,
    eventCount: 1,
    actorCount: 0,
    actors: [],
    target: {
      type: "release",
      releaseGroupId: "00000000-0000-4000-8000-00000000000c",
      title: "Animals",
      artistName: "Pink Floyd",
      category: "album",
      releaseDate: "2026-10-23",
      coverUrl: null,
    },
  };
}

function award(): NotificationGroup {
  return {
    id: "award:ceremony-1",
    kind: "artist_award_win",
    lastAt: "2026-10-24T10:00:00.000Z",
    unread: true,
    eventCount: 1,
    actorCount: 0,
    actors: [],
    target: {
      type: "award",
      ceremonyId: "00000000-0000-4000-8000-00000000000d",
      awardSlug: "grammy",
      awardName: "grammy",
      year: 2026,
      isHallOfFame: false,
      artistName: "Pink Floyd",
      artistCount: 2,
      count: 3,
    },
  };
}

function section(entries: NotificationGroup[], more = 0): DigestSection {
  return {
    tab: "for_you",
    entries,
    more,
    total: entries.length + more,
  };
}

function digest(overrides: Partial<NotificationDigest> = {}): NotificationDigest {
  const forYou = overrides.forYou ?? section([reply()]);
  const releases = overrides.releases ?? section([release()]);
  return {
    forYou,
    releases,
    total: overrides.total ?? forYou.total + releases.total,
  };
}

function build(overrides: Partial<Parameters<typeof buildNotificationDigestEmail>[0]> = {}) {
  return buildNotificationDigestEmail({
    to: "ana@example.com",
    locale: "es",
    digest: digest(),
    inboxUrl: INBOX,
    unsubscribeUrl: UNSUBSCRIBE,
    unsubscribeApiUrl: UNSUBSCRIBE_API,
    ...overrides,
  });
}

describe("buildNotificationDigestEmail", () => {
  it("arma el resumen en español con las dos secciones, la bandeja y la baja", () => {
    const message = build();
    expect(message).not.toBeNull();

    expect(message!.to).toBe("ana@example.com");
    expect(message!.subject).toBe("Tu semana en music-platform: 2 novedades");
    expect(message!.text).toContain("Para ti");
    expect(message!.text).toContain("Ana respondió a tu tema en Pink Floyd");
    expect(message!.text).toContain("Novedades");
    expect(message!.text).toContain("Salió Animals, el nuevo álbum de Pink Floyd");
    expect(message!.text).toContain(INBOX);
    expect(message!.text).toContain(UNSUBSCRIBE);
    expect(message!.html).toContain(`href="${INBOX}"`);
    expect(message!.html).toContain(`href="${UNSUBSCRIBE}"`);
  });

  it("lleva las cabeceras de baja en un clic (RFC 8058)", () => {
    const message = build();

    expect(message!.headers).toEqual({
      "List-Unsubscribe": `<${UNSUBSCRIBE_API}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });

  it("usa el idioma de la persona y cae a español si no es uno soportado", () => {
    const en = build({ locale: "en" });
    expect(en!.subject).toBe("Your week on music-platform: 2 updates");
    expect(en!.text).toContain("For you");
    expect(en!.text).toContain("Ana replied to your thread on Pink Floyd");

    const other = build({ locale: "fr" });
    expect(other!.subject).toBe("Tu semana en music-platform: 2 novedades");
  });

  it("una sola entrada no pluraliza de más", () => {
    const message = build({
      digest: digest({
        forYou: section([reply()]),
        releases: section([]),
        total: 1,
      }),
    });

    expect(message!.subject).toBe("Tu semana en music-platform: 1 novedad");
    expect(message!.text).toContain("1 entrada sin leer");
    // Una sección vacía no se titula.
    expect(message!.text).not.toContain("Novedades");
  });

  it("cuenta el resto como «y N más» sin listarlo", () => {
    const entries = Array.from({ length: 8 }, (_, index) =>
      reply({ id: `thread:${index}` }),
    );
    const message = build({
      digest: digest({
        forYou: section(entries, 3),
        releases: section([]),
        total: 11,
      }),
    });

    expect(message!.text).toContain("y 3 entradas más");
    expect(message!.html).toContain("y 3 entradas más");
    expect(message!.text.match(/respondió a tu tema/g)).toHaveLength(8);
  });

  it("escapa el HTML del contenido y de las URLs", () => {
    const message = build({
      digest: digest({
        forYou: section([
          reply({
            actors: [
              {
                id: "00000000-0000-4000-8000-00000000000a",
                username: "ana",
                displayName: "<script>alert(1)</script>",
                avatarUrl: null,
              },
            ],
          }),
        ]),
        releases: section([]),
        total: 1,
      }),
      inboxUrl: 'https://music.example/"><script>',
    });

    expect(message!.html).not.toContain("<script>");
    expect(message!.html).toContain("&lt;script&gt;");
    expect(message!.html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("localiza el nombre del premio y cuenta los artistas seguidos", () => {
    const message = build({
      digest: digest({
        forYou: section([]),
        releases: section([award()]),
        total: 1,
      }),
    });

    expect(message!.text).toContain(
      "Pink Floyd y 1 artista más ganaron 3 premios en Premios Grammy 2026",
    );
  });

  it("una semana vacía no arma correo", () => {
    const message = build({
      digest: digest({
        forYou: section([]),
        releases: section([]),
        total: 0,
      }),
    });

    expect(message).toBeNull();
  });

  it("no incluye métricas de actividad propia ni recordatorios de inactividad", () => {
    const message = build();
    const body = `${message!.subject}\n${message!.text}\n${message!.html}`.toLowerCase();

    for (const forbidden of ["racha", "streak", "días sin entrar", "days away", "te estás perdiendo"]) {
      expect(body).not.toContain(forbidden);
    }
  });
});
