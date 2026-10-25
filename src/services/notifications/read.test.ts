import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appUser,
  artist,
  comment,
  moderationAction,
  notification,
  releaseGroup,
  userList,
} from "@/db/schema";
import {
  TAB_KINDS,
  countUnseen,
  hasNewReleases,
  listNotificationGroups,
  markRead,
  markSeen,
  pruneNotifications,
} from "./read";

const mocks = vi.hoisted(() => ({
  db: { select: vi.fn(), update: vi.fn(), delete: vi.fn() },
  resolveImageUrls: vi.fn(),
}));

vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/services/storage/avatar-urls", () => ({
  resolveImageUrls: mocks.resolveImageUrls,
}));

// Las subconsultas no se ejecutan: se reemplazan por columnas reales del
// esquema (lo único que la agrupación necesita para construir el SQL). Los
// filtros de D4 se verifican contra Postgres en el smoke test.
const VISIBLE = {
  groupKey: notification.groupKey,
  kind: notification.kind,
  actorId: notification.actorId,
  createdAt: notification.createdAt,
  readAt: notification.readAt,
  actorUsername: appUser.username,
  actorDisplayName: appUser.displayName,
  actorAvatarImageId: appUser.avatarImageId,
  artistId: artist.id,
  artistName: artist.name,
  rootId: comment.parentId,
  moderationAction: moderationAction.action,
  moderationReason: moderationAction.reason,
  moderationContentType: moderationAction.commentId,
  milestone: notification.milestone,
  listId: userList.id,
  listTitle: userList.title,
  listKind: userList.kind,
  releaseGroupId: releaseGroup.id,
  releaseTitle: releaseGroup.title,
  releaseArtistName: artist.name,
  releaseCategory: releaseGroup.category,
  releasePrimaryType: releaseGroup.primaryType,
  releaseDate: releaseGroup.firstReleaseDate,
  releaseCoverUrl: releaseGroup.coverThumbUrl,
};

const GROUPED = {
  groupId: notification.id,
  kind: notification.kind,
  actorId: notification.actorId,
  createdAt: notification.createdAt,
  readAt: notification.readAt,
  actorUsername: appUser.username,
  actorDisplayName: appUser.displayName,
  actorAvatarImageId: appUser.avatarImageId,
  artistId: artist.id,
  artistName: artist.name,
  rootId: comment.parentId,
  moderationAction: moderationAction.action,
  moderationReason: moderationAction.reason,
  moderationContentType: moderationAction.commentId,
  milestone: notification.milestone,
  listId: userList.id,
  listTitle: userList.title,
  listKind: userList.kind,
  releaseGroupId: releaseGroup.id,
  releaseTitle: releaseGroup.title,
  releaseArtistName: artist.name,
  releaseCategory: releaseGroup.category,
  releasePrimaryType: releaseGroup.primaryType,
  releaseDate: releaseGroup.firstReleaseDate,
  releaseCoverUrl: releaseGroup.coverThumbUrl,
};

type Chain = Record<string, ReturnType<typeof vi.fn>>;

/**
 * Cadena falsa de drizzle: cualquier método devuelve la misma cadena (que a su
 * vez es `thenable` y resuelve `rows`), salvo `as`, que devuelve las columnas de
 * la subconsulta. Sirve para las cinco consultas del listado sin replicar la
 * forma exacta de cada una.
 */
function queryChain(options: { rows?: unknown[]; as?: unknown } = {}): Chain {
  const chain: Chain = {};
  for (const method of ["from", "leftJoin", "where", "groupBy", "orderBy", "limit", "having"]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.as = vi.fn(() => options.as ?? chain);
  Object.defineProperty(chain, "then", {
    value: (resolve: (value: unknown[]) => unknown) => Promise.resolve(options.rows ?? []).then(resolve),
  });
  return chain;
}

/** Las cinco `select` del listado (bloqueos, visibles, agrupadas, página y personas). */
function mockPage(rows: unknown[], actors: unknown[]) {
  mocks.db.select
    .mockReturnValueOnce(queryChain())
    .mockReturnValueOnce(queryChain({ as: VISIBLE }))
    .mockReturnValueOnce(queryChain({ as: GROUPED }))
    .mockReturnValueOnce(queryChain({ rows }))
    .mockReturnValueOnce(queryChain({ rows: actors }));
}

function groupRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "thread:root",
    kind: "comment_reply",
    lastAt: "2026-10-23T10:00:00.000Z",
    unread: true,
    eventCount: 2,
    actorCount: 2,
    artistId: "artist-1",
    artistName: "Banda",
    rootId: "root",
    actorUsername: "bruno",
    moderationAction: null,
    moderationReason: null,
    moderationContentType: null,
    milestone: null,
    listId: null,
    listTitle: null,
    listKind: null,
    releaseGroupId: null,
    releaseTitle: null,
    releaseArtistName: null,
    releaseCategory: null,
    releasePrimaryType: null,
    releaseDate: null,
    releaseCoverUrl: null,
    commentSubject: null,
    commentSubjectId: null,
    commentSubjectName: null,
    commentSubjectArtistName: null,
    ...overrides,
  };
}

function actorRow(overrides: Record<string, unknown> = {}) {
  return {
    groupId: "thread:root",
    id: "u1",
    username: "bruno",
    displayName: "Bruno",
    avatarImageId: null,
    lastAt: "2026-10-23T10:00:00.000Z",
    ...overrides,
  };
}

function mockUpdate() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  mocks.db.update.mockReturnValue({ set });
  return { set, where };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolveImageUrls.mockResolvedValue(new Map());
});

describe("listNotificationGroups", () => {
  it("arma la entrada del hilo con su artista, la fecha en ISO y el punto de no leída", async () => {
    mockPage([groupRow()], [actorRow()]);

    const result = await listNotificationGroups("me");

    expect(result.nextCursor).toBeNull();
    expect(result.groups).toEqual([
      {
        id: "thread:root",
        kind: "comment_reply",
        lastAt: "2026-10-23T10:00:00.000Z",
        unread: true,
        eventCount: 2,
        actorCount: 2,
        actors: [{ id: "u1", username: "bruno", displayName: "Bruno", avatarUrl: null }],
        target: { type: "artist", artistId: "artist-1", artistName: "Banda", rootId: "root" },
      },
    ]);
  });

  it("una solicitud de seguimiento enlaza al perfil de quien la envió", async () => {
    mockPage(
      [
        groupRow({
          id: "follow:abc",
          kind: "follow_request",
          artistId: null,
          artistName: null,
          rootId: null,
          actorUsername: "carla",
        }),
      ],
      [actorRow({ groupId: "follow:abc", id: "u3", username: "carla" })],
    );

    const [group] = (await listNotificationGroups("me")).groups;

    expect(group!.target).toEqual({ type: "profile", username: "carla" });
  });

  it("la moderación trae acción, objeto y motivo, y no tiene personas", async () => {
    mockPage(
      [
        groupRow({
          id: "moderation:abc",
          kind: "moderation",
          actorCount: 0,
          artistId: null,
          artistName: null,
          rootId: null,
          actorUsername: null,
          moderationAction: "hide",
          moderationReason: "Spam",
          moderationContentType: "comment",
        }),
      ],
      [],
    );

    const [group] = (await listNotificationGroups("me")).groups;

    expect(group!.target).toEqual({
      type: "moderation",
      action: "hide",
      contentType: "comment",
      reason: "Spam",
    });
    expect(group!.actors).toEqual([]);
  });

  it("un hito de me gusta enlaza al hilo con el hito más alto del grupo", async () => {
    mockPage(
      [
        groupRow({
          id: "likes:comment-1",
          kind: "comment_like_milestone",
          actorCount: 0,
          actorUsername: null,
          milestone: 25,
          commentSubject: "artist",
          commentSubjectId: "artist-1",
          commentSubjectName: "Banda",
          commentSubjectArtistName: null,
        }),
      ],
      [],
    );

    const [group] = (await listNotificationGroups("me")).groups;

    expect(group!.target).toEqual({
      type: "comment",
      subject: "artist",
      subjectId: "artist-1",
      subjectName: "Banda",
      subjectArtistName: null,
      rootId: "root",
      milestone: 25,
    });
  });

  it("un hito de me gusta en un álbum nombra el disco y no lleva hilo", async () => {
    mockPage(
      [
        groupRow({
          id: "likes:comment-2",
          kind: "comment_like_milestone",
          actorCount: 0,
          actorUsername: null,
          artistId: null,
          artistName: null,
          rootId: "comment-2",
          milestone: 10,
          commentSubject: "album",
          commentSubjectId: "rg-1",
          commentSubjectName: "The Wall",
          commentSubjectArtistName: "Pink Floyd",
        }),
      ],
      [],
    );

    const [group] = (await listNotificationGroups("me")).groups;

    expect(group!.target).toEqual({
      type: "comment",
      subject: "album",
      subjectId: "rg-1",
      subjectName: "The Wall",
      subjectArtistName: "Pink Floyd",
      rootId: null,
      milestone: 10,
    });
  });

  it("un hito de guardados distingue una lista de un Camino", async () => {
    mockPage(
      [
        groupRow({
          id: "saves:list-1",
          kind: "list_save_milestone",
          actorCount: 0,
          artistId: null,
          artistName: null,
          rootId: null,
          actorUsername: null,
          milestone: 5,
          listId: "list-1",
          listTitle: "Mis favoritos",
          listKind: "custom_journey",
        }),
      ],
      [],
    );

    const [group] = (await listNotificationGroups("me")).groups;

    expect(group!.target).toEqual({
      type: "list",
      listId: "list-1",
      title: "Mis favoritos",
      isCamino: true,
      milestone: 5,
    });
  });

  it("un lanzamiento trae carátula, fecha y la categoría normalizada", async () => {
    mockPage(
      [
        groupRow({
          id: "release:rg-1",
          kind: "artist_release",
          actorCount: 0,
          artistId: null,
          artistName: null,
          rootId: null,
          actorUsername: null,
          releaseGroupId: "rg-1",
          releaseTitle: "Disco nuevo",
          releaseArtistName: "Banda",
          releaseCategory: "studio",
          releasePrimaryType: "Single",
          releaseDate: "2026-10-20",
          releaseCoverUrl: "https://cover/1.jpg",
        }),
      ],
      [],
    );

    const [group] = (await listNotificationGroups("me", { tab: "releases" })).groups;

    expect(group!.target).toEqual({
      type: "release",
      releaseGroupId: "rg-1",
      title: "Disco nuevo",
      artistName: "Banda",
      category: "single",
      releaseDate: "2026-10-20",
      coverUrl: "https://cover/1.jpg",
    });
  });

  it("sin fecha exacta el anunciado deja `releaseDate` en null", async () => {
    mockPage(
      [
        groupRow({
          id: "announced:rg-2",
          kind: "artist_release_announced",
          actorCount: 0,
          artistId: null,
          artistName: null,
          rootId: null,
          actorUsername: null,
          releaseGroupId: "rg-2",
          releaseTitle: "Por salir",
          releaseArtistName: "Banda",
          releaseCategory: "studio",
          releasePrimaryType: "EP",
          releaseDate: null,
          releaseCoverUrl: null,
        }),
      ],
      [],
    );

    const [group] = (await listNotificationGroups("me", { tab: "releases" })).groups;

    expect(group!.target).toMatchObject({ type: "release", category: "ep", releaseDate: null });
  });

  it("separa los tipos de cada pestaña", () => {
    expect(TAB_KINDS.for_you).toEqual(
      expect.arrayContaining(["comment_like_milestone", "list_save_milestone"]),
    );
    expect(TAB_KINDS.for_you).not.toContain("artist_release");
    expect(TAB_KINDS.releases).toEqual([
      "artist_release",
      "artist_release_announced",
      "artist_single",
    ]);
  });

  it("recorta a dos nombres; el resto queda como cifra del grupo", async () => {
    mockPage(
      [groupRow({ actorCount: 3 })],
      [
        actorRow({ id: "u1", username: "bruno", displayName: "Bruno" }),
        actorRow({ id: "u2", username: "carla", displayName: "Carla" }),
        actorRow({ id: "u3", username: "diego", displayName: "Diego" }),
      ],
    );

    const [group] = (await listNotificationGroups("me")).groups;

    expect(group!.actors.map((actor) => actor.displayName)).toEqual(["Bruno", "Carla"]);
    expect(group!.actorCount).toBe(3);
  });

  it("devuelve cursor solo cuando queda otra página y lo calcula con la última entrada", async () => {
    mockPage([groupRow(), groupRow({ id: "follow:abc" })], []);

    const result = await listNotificationGroups("me", { pageSize: 1 });

    expect(result.groups).toHaveLength(1);
    expect(result.nextCursor).toBe(`${groupRow().lastAt}|thread:root`);
  });

  it("el cursor conserva los microsegundos de la fecha que da Postgres", async () => {
    mockPage(
      [
        groupRow({ lastAt: "2026-10-23T10:00:00.123456+00:00" }),
        groupRow({ id: "follow:abc" }),
      ],
      [],
    );

    const result = await listNotificationGroups("me", { pageSize: 1 });

    expect(result.nextCursor).toBe("2026-10-23T10:00:00.123456+00:00|thread:root");
  });

  it("aplica el cursor al grupo en el HAVING", async () => {
    const page = queryChain({ rows: [groupRow()] });
    mocks.db.select
      .mockReturnValueOnce(queryChain())
      .mockReturnValueOnce(queryChain({ as: VISIBLE }))
      .mockReturnValueOnce(queryChain({ as: GROUPED }))
      .mockReturnValueOnce(page)
      .mockReturnValueOnce(queryChain({ rows: [] }));

    await listNotificationGroups("me", { cursor: "2026-10-22T10:00:00.000Z|thread:root" });

    expect(page.having).toHaveBeenCalledTimes(1);
  });

  it("rechaza un cursor mal formado sin consultar la base", async () => {
    await expect(listNotificationGroups("me", { cursor: "sin-fecha" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      status: 400,
    });
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("consulta las personas de la página en una sola consulta", async () => {
    mockPage([groupRow()], [actorRow()]);

    await listNotificationGroups("me", { timeZone: "America/Santiago" });

    expect(mocks.db.select).toHaveBeenCalledTimes(5);
    expect(mocks.resolveImageUrls).toHaveBeenCalledWith([null]);
  });
});

describe("countUnseen", () => {
  it("devuelve el número de entradas con algo sin leer", async () => {
    mocks.db.select
      .mockReturnValueOnce(queryChain())
      .mockReturnValueOnce(queryChain())
      .mockReturnValueOnce(queryChain({ rows: [{ count: 3 }] }));

    expect(await countUnseen("me")).toBe(3);
  });

  it("sin filas devuelve cero", async () => {
    mocks.db.select
      .mockReturnValueOnce(queryChain())
      .mockReturnValueOnce(queryChain())
      .mockReturnValueOnce(queryChain({ rows: [] }));

    expect(await countUnseen("me")).toBe(0);
  });
});

describe("markRead", () => {
  it("con `all` marca todas las no leídas del destinatario", async () => {
    const { set } = mockUpdate();

    await markRead("me", { all: true });

    expect(set).toHaveBeenCalledTimes(1);
    expect(mocks.db.update).toHaveBeenCalledTimes(1);
  });

  it("con claves marca solo esas entradas y separa el día de los seguidores", async () => {
    const { set } = mockUpdate();

    await markRead("me", { groupKeys: ["thread:root", "followers:2026-10-23"] });

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith({ readAt: expect.any(Date) });
  });

  it("no consulta la base si no hay claves", async () => {
    await markRead("me", { groupKeys: [] });

    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("rechaza un día de seguidores que no es una fecha", async () => {
    await expect(markRead("me", { groupKeys: ["followers:ayer"] })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(mocks.db.update).not.toHaveBeenCalled();
  });
});

describe("hasNewReleases", () => {
  it("hay novedades cuando queda alguna fila de lanzamiento sin leer", async () => {
    mocks.db.select
      .mockReturnValueOnce(queryChain())
      .mockReturnValueOnce(queryChain({ rows: [{ one: 1 }] }));

    expect(await hasNewReleases("me")).toBe(true);
  });

  it("sin filas no hay punto de Novedades", async () => {
    mocks.db.select
      .mockReturnValueOnce(queryChain())
      .mockReturnValueOnce(queryChain({ rows: [] }));

    expect(await hasNewReleases("me")).toBe(false);
  });
});

describe("markSeen y retención", () => {
  it("marca la bandeja como vista con la fecha actual", async () => {
    const { set } = mockUpdate();

    await markSeen("me");

    expect(set).toHaveBeenCalledWith({ notificationsSeenAt: expect.any(Date) });
  });

  it("abrir Novedades mueve solo su propia marca", async () => {
    const { set } = mockUpdate();

    await markSeen("me", "releases");

    expect(set).toHaveBeenCalledWith({ notificationsReleasesSeenAt: expect.any(Date) });
  });

  it("poda solo las filas del destinatario", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    mocks.db.delete.mockReturnValue({ where });

    await pruneNotifications("me");

    expect(where).toHaveBeenCalledTimes(1);
    expect(mocks.db.delete).toHaveBeenCalledTimes(1);
  });
});
