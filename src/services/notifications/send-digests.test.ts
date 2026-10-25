import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NotificationGroup } from "./read";
import type { NotificationDigest } from "./digest";
import type { EmailMessage } from "@/services/email";
import {
  DEFAULT_SEND_INTERVAL_MS,
  sendNotificationDigests,
  weekStartUtc,
} from "./send-digests";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), update: vi.fn(), $client: { reserve: vi.fn() } },
  buildDigest: vi.fn(),
  getEmailTransport: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("./digest", () => ({ buildDigest: mocks.buildDigest }));
vi.mock("@/services/email", () => ({ getEmailTransport: mocks.getEmailTransport }));

const ANA = "00000000-0000-4000-8000-00000000000a";
const BRUNO = "00000000-0000-4000-8000-00000000000b";
const NOW = new Date("2026-10-26T10:00:00.000Z"); // lunes

type Recipient = {
  id: string;
  email: string;
  locale: string | null;
  timezone: string | null;
  sentAt: Date | null;
};

function recipient(overrides: Partial<Recipient> = {}): Recipient {
  return {
    id: ANA,
    email: "ana@example.com",
    locale: "es",
    timezone: "America/Santiago",
    sentAt: null,
    ...overrides,
  };
}

const release: NotificationGroup = {
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

function digest(hasEntries: boolean): NotificationDigest {
  const entries = hasEntries ? [release] : [];
  return {
    forYou: { tab: "for_you", entries: [], more: 0, total: 0 },
    releases: {
      tab: "releases",
      entries,
      more: 0,
      total: entries.length,
    },
    total: entries.length,
  };
}

function mockRecipients(rows: Recipient[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ where }));
  mocks.db.select.mockReturnValue({ from });
  return { from, where };
}

function mockUpdates() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  mocks.db.update.mockReturnValue({ set });
  return { set, where };
}

function mockLock(locked = true) {
  const query = vi
    .fn()
    .mockResolvedValueOnce([{ locked }])
    .mockResolvedValueOnce([{ pg_advisory_unlock: true }]);
  const connection = Object.assign(query, { release: vi.fn() });
  mocks.db.$client.reserve.mockResolvedValue(connection);
  return { query, release: connection.release };
}

function transport() {
  const send = vi.fn().mockResolvedValue(undefined);
  mocks.getEmailTransport.mockReturnValue({ send });
  return { send };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://music.example");
  vi.stubEnv("EMAIL_UNSUBSCRIBE_SECRET", "secreto-de-prueba");
  vi.stubEnv("DIGEST_SEND_INTERVAL_MS", "0");
  mockLock();
  mockRecipients([]);
  mockUpdates();
  mocks.buildDigest.mockResolvedValue(digest(true));
  mocks.getEmailTransport.mockReturnValue({ send: vi.fn() });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("weekStartUtc", () => {
  it("devuelve el lunes 00:00 UTC de la semana de la fecha", () => {
    expect(weekStartUtc(new Date("2026-10-26T10:00:00.000Z")).toISOString()).toBe(
      "2026-10-26T00:00:00.000Z",
    );
    expect(weekStartUtc(new Date("2026-10-29T23:59:59.000Z")).toISOString()).toBe(
      "2026-10-26T00:00:00.000Z",
    );
    // Domingo 1 de noviembre de 2026 cae en la semana del lunes 26 de octubre.
    expect(weekStartUtc(new Date("2026-11-01T23:00:00.000Z")).toISOString()).toBe(
      "2026-10-26T00:00:00.000Z",
    );
  });
});

describe("sendNotificationDigests", () => {
  it("si otra corrida tiene el lock, no hace nada", async () => {
    const { query, release } = mockLock(false);

    const result = await sendNotificationDigests(NOW);

    expect(result).toEqual({ status: "locked" });
    expect(mocks.db.select).not.toHaveBeenCalled();
    expect(mocks.getEmailTransport).not.toHaveBeenCalled();
    // No se intenta liberar un lock que no se tomó.
    expect(query).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("envía solo a quien tiene algo sin leer y marca después de entregar", async () => {
    mockRecipients([
      recipient(),
      recipient({ id: BRUNO, email: "bruno@example.com" }),
    ]);
    mocks.buildDigest
      .mockResolvedValueOnce(digest(true))
      .mockResolvedValueOnce(digest(false));
    const { send } = transport();
    const { set, where } = mockUpdates();
    const { query, release } = mockLock();

    const result = await sendNotificationDigests(NOW);

    expect(result).toEqual({
      status: "done",
      dryRun: false,
      recipients: 2,
      sent: 1,
      wouldSend: 0,
      empty: 1,
      failed: 0,
    });
    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0]![0] as EmailMessage;
    expect(message.to).toBe("ana@example.com");
    expect(message.text).toContain("Salió Animals, el nuevo álbum de Pink Floyd");
    expect(message.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    // La marca se mueve solo para quien recibió el correo.
    expect(set).toHaveBeenCalledWith({ notificationDigestSentAt: NOW });
    expect(where).toHaveBeenCalledTimes(1);

    expect(query).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("usa la marca anterior como inicio y, sin marca, los últimos siete días", async () => {
    const sentAt = new Date("2026-10-19T10:00:00.000Z");
    mockRecipients([recipient({ sentAt }), recipient({ id: BRUNO, sentAt: null })]);

    await sendNotificationDigests(NOW);

    expect(mocks.buildDigest).toHaveBeenNthCalledWith(1, ANA, sentAt, NOW, {
      timeZone: "America/Santiago",
    });
    expect(mocks.buildDigest).toHaveBeenNthCalledWith(
      2,
      BRUNO,
      new Date("2026-10-19T10:00:00.000Z"),
      NOW,
      { timeZone: "America/Santiago" },
    );
  });

  it("un fallo de una persona no corta el lote ni mueve su marca", async () => {
    mockRecipients([recipient(), recipient({ id: BRUNO })]);
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("El proveedor respondió 500"))
      .mockResolvedValueOnce(undefined);
    mocks.getEmailTransport.mockReturnValue({ send });
    const { where } = mockUpdates();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendNotificationDigests(NOW);

    expect(result).toMatchObject({ sent: 1, failed: 1, recipients: 2 });
    expect(send).toHaveBeenCalledTimes(2);
    // Solo se marcó a la segunda persona.
    expect(where).toHaveBeenCalledTimes(1);
    expect(errors).toHaveBeenCalledTimes(1);
    errors.mockRestore();
  });

  it("en dry run arma los resúmenes sin enviar ni marcar", async () => {
    mockRecipients([recipient()]);
    const { where } = mockUpdates();

    const result = await sendNotificationDigests(NOW, { dryRun: true });

    expect(result).toMatchObject({ dryRun: true, wouldSend: 1, sent: 0, failed: 0 });
    expect(mocks.getEmailTransport).not.toHaveBeenCalled();
    expect(where).not.toHaveBeenCalled();
  });

  it("respeta el idioma de la persona en el asunto y en el enlace a la bandeja", async () => {
    mockRecipients([recipient({ locale: "en" })]);
    const { send } = transport();

    await sendNotificationDigests(NOW);

    const message = send.mock.calls[0]![0] as EmailMessage;
    expect(message.subject).toBe("Your week on music-platform: 1 update");
    expect(message.text).toContain("https://music.example/en/me/notifications");
  });

  it("sin destinatarios no pide el transporte ni escribe marcas", async () => {
    const result = await sendNotificationDigests(NOW);

    expect(result).toMatchObject({ recipients: 0, sent: 0, empty: 0 });
    expect(mocks.getEmailTransport).not.toHaveBeenCalled();
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("la pausa por defecto protege el límite del proveedor", () => {
    expect(DEFAULT_SEND_INTERVAL_MS).toBe(600);
  });
});
