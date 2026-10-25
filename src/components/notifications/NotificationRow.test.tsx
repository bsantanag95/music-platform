import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import type { NotificationGroupValue } from "@/lib/api/schemas";
import { NotificationRow } from "./NotificationRow";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  markNotificationsRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    onClick,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent) => void;
  }) => (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        // jsdom no implementa la navegación entre documentos.
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
  usePathname: () => "/album/rg-1",
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  apiFetch: mocks.apiFetch,
}));

vi.mock("./api", () => ({
  markNotificationsRead: mocks.markNotificationsRead,
  markNotificationsSeen: vi.fn().mockResolvedValue(undefined),
  fetchNotificationCount: vi.fn(),
  fetchNotificationPage: vi.fn(),
}));

const ANA = { id: "u-ana", username: "ana", displayName: "Ana", avatarUrl: null };
const BRUNO = { id: "u-bruno", username: "bruno", displayName: "Bruno", avatarUrl: null };

function group(overrides: Partial<NotificationGroupValue>): NotificationGroupValue {
  return {
    id: "thread:root-1",
    kind: "comment_reply",
    lastAt: "2026-10-20T12:00:00.000Z",
    unread: true,
    eventCount: 1,
    actorCount: 1,
    actors: [BRUNO],
    target: { type: "artist", artistId: "a-1", artistName: "Pink Floyd", rootId: "root-1" },
    ...overrides,
  };
}

function renderRow(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>, "es", {
    timeZone: "America/Santiago",
  });
}

describe("NotificationRow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redacta una respuesta con dos personas y enlaza al artista", () => {
    renderRow(<NotificationRow group={group({ actorCount: 2, actors: [ANA, BRUNO] })} />);

    const link = screen.getByRole("link", {
      name: /Ana y Bruno respondieron a tu tema en Pink Floyd/,
    });
    expect(link).toHaveAttribute("href", `${artistHref("Pink Floyd", "a-1")}?thread=root-1`);
  });

  it("resume los nombres y las personas que faltan cuando hay más de dos", () => {
    renderRow(<NotificationRow group={group({ actorCount: 4, actors: [ANA, BRUNO] })} />);

    expect(
      screen.getByText(/Ana, Bruno y 2 personas más respondieron a tu tema en Pink Floyd/),
    ).toBeInTheDocument();
  });

  it("usa el username cuando no hay nombre visible", () => {
    renderRow(
      <NotificationRow
        group={group({
          kind: "new_follower",
          actors: [{ ...BRUNO, displayName: null }],
          target: { type: "profile", username: "bruno" },
        })}
      />,
    );

    expect(screen.getByRole("link", { name: /bruno te empezó a seguir/ })).toHaveAttribute(
      "href",
      "/users/bruno",
    );
  });

  it("la moderación no enlaza y muestra el motivo sin nombrar al moderador", () => {
    renderRow(
      <NotificationRow
        group={group({
          kind: "moderation",
          actors: [],
          actorCount: 0,
          target: { type: "moderation", action: "hide", contentType: "review", reason: "spam" },
        })}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Se ocultó tu reseña")).toBeInTheDocument();
    expect(screen.getByText("Motivo: spam")).toBeInTheDocument();
  });

  it("agrupa a los seguidores del día con dos nombres y el resto como cifra", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "followers:2026-10-23",
          kind: "new_follower",
          actors: [ANA, BRUNO],
          actorCount: 5,
          eventCount: 5,
          target: { type: "profile", username: "ana" },
        })}
      />,
    );

    expect(
      screen.getByText("Ana, Bruno y 3 personas más te empezaron a seguir"),
    ).toBeInTheDocument();
  });

  it("dos seguidores del día se nombran los dos", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "followers:2026-10-23",
          kind: "new_follower",
          actors: [ANA, BRUNO],
          actorCount: 2,
          target: { type: "profile", username: "ana" },
        })}
      />,
    );

    expect(screen.getByText("Ana y Bruno te empezaron a seguir")).toBeInTheDocument();
  });

  it("una entrada de moderación sin leer se marca leída con su botón", async () => {
    const onRead = vi.fn();
    renderRow(
      <NotificationRow
        group={group({
          id: "moderation:m-1",
          kind: "moderation",
          actors: [],
          actorCount: 0,
          target: { type: "moderation", action: "hide", contentType: "comment", reason: "spam" },
        })}
        onRead={onRead}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Marcar como leída" }));

    expect(onRead).toHaveBeenCalled();
    await waitFor(() =>
      expect(mocks.markNotificationsRead).toHaveBeenCalledWith(
        { groupKeys: ["moderation:m-1"] },
        "America/Santiago",
      ),
    );
  });

  it("una entrada de moderación ya leída no ofrece el botón", () => {
    renderRow(
      <NotificationRow
        group={group({
          kind: "moderation",
          unread: false,
          actors: [],
          actorCount: 0,
          target: { type: "moderation", action: "hide", contentType: "comment", reason: "spam" },
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Marcar como leída" })).not.toBeInTheDocument();
  });

  it("marca la entrada como leída al abrir su destino", async () => {
    const onRead = vi.fn();
    renderRow(<NotificationRow group={group({})} onRead={onRead} />);

    await userEvent.click(screen.getByRole("link", { name: /a tu tema en Pink Floyd/ }));

    expect(onRead).toHaveBeenCalled();
    await waitFor(() =>
      expect(mocks.markNotificationsRead).toHaveBeenCalledWith(
        { groupKeys: ["thread:root-1"] },
        "America/Santiago",
      ),
    );
  });

  it("no vuelve a marcar como leída una entrada ya leída", async () => {
    renderRow(<NotificationRow group={group({ unread: false })} />);

    await userEvent.click(screen.getByRole("link", { name: /a tu tema en Pink Floyd/ }));

    expect(mocks.markNotificationsRead).not.toHaveBeenCalled();
  });

  it("aprueba una solicitud y avisa para que la entrada desaparezca", async () => {
    mocks.apiFetch.mockResolvedValue(undefined);
    const onResolved = vi.fn();
    renderRow(
      <NotificationRow
        group={group({
          kind: "follow_request",
          id: "follow:f-1",
          target: { type: "profile", username: "bruno" },
        })}
        onResolved={onResolved}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Aprobar" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/follow-requests/u-bruno/approve",
      expect.anything(),
      { method: "POST" },
    );
    await waitFor(() => expect(onResolved).toHaveBeenCalled());
  });

  it("rechaza una solicitud y muestra el error localizado si falla", async () => {
    const { ApiError } = await import("@/lib/api/client");
    mocks.apiFetch.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "no"));
    renderRow(
      <NotificationRow
        group={group({
          kind: "follow_request",
          id: "follow:f-1",
          target: { type: "profile", username: "bruno" },
        })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/me/follow-requests/u-bruno/reject",
      expect.anything(),
      { method: "POST" },
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos completar la solicitud. Intenta de nuevo en un momento.",
    );
  });

  it("un hito de me gusta no tiene persona y enlaza al hilo", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "likes:comment-1",
          kind: "comment_like_milestone",
          actors: [],
          actorCount: 0,
          target: {
            type: "comment",
            subject: "artist",
            subjectId: "a-1",
            subjectName: "Pink Floyd",
            subjectArtistName: null,
            rootId: "root-1",
            milestone: 25,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Tu comentario sobre Pink Floyd llegó a 25 me gusta/ }),
    ).toHaveAttribute("href", `${artistHref("Pink Floyd", "a-1")}?thread=root-1`);
  });

  it("un hito de me gusta en un álbum nombra el disco y enlaza a su página", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "likes:comment-2",
          kind: "comment_like_milestone",
          actors: [],
          actorCount: 0,
          target: {
            type: "comment",
            subject: "album",
            subjectId: "rg-1",
            subjectName: "The Wall",
            subjectArtistName: "Pink Floyd",
            rootId: null,
            milestone: 10,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Tu comentario sobre The Wall llegó a 10 me gusta/ }),
    ).toHaveAttribute("href", albumHref("Pink Floyd", "The Wall", "rg-1"));
  });

  it("un hito de me gusta en una canción enlaza a la canción", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "likes:comment-3",
          kind: "comment_like_milestone",
          actors: [],
          actorCount: 0,
          target: {
            type: "comment",
            subject: "song",
            subjectId: "rec-1",
            subjectName: "Comfortably Numb",
            subjectArtistName: "Pink Floyd",
            rootId: null,
            milestone: 50,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Tu comentario sobre Comfortably Numb llegó a 50 me gusta/ }),
    ).toHaveAttribute("href", songHref("Pink Floyd", "Comfortably Numb", "rec-1"));
  });

  it("el primer guardado concuerda en singular", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "saves:list-9",
          kind: "list_save_milestone",
          actors: [],
          actorCount: 0,
          target: { type: "list", listId: "list-9", title: "Raras", isCamino: false, milestone: 1 },
        })}
      />,
    );

    expect(screen.getByRole("link", { name: /Tu lista «Raras» ya la guardó 1 persona/ })).toBeInTheDocument();
  });

  it("un hito de guardados enlaza a la lista propia del dueño", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "saves:list-1",
          kind: "list_save_milestone",
          actors: [],
          actorCount: 0,
          target: {
            type: "list",
            listId: "list-1",
            title: "Mis favoritos",
            isCamino: false,
            milestone: 10,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: /Tu lista «Mis favoritos» ya la guardaron 10 personas/,
      }),
    ).toHaveAttribute("href", "/me/lists/list-1");
  });

  it("un hito de guardados de un Camino usa su ruta y su nombre", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "saves:camino-1",
          kind: "list_save_milestone",
          actors: [],
          actorCount: 0,
          target: {
            type: "list",
            listId: "camino-1",
            title: "Ruta larga",
            isCamino: true,
            milestone: 5,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: /Tu Camino «Ruta larga» ya lo guardaron 5 personas/,
      }),
    ).toHaveAttribute("href", "/me/caminos/camino-1");
  });

  it("un lanzamiento muestra su categoría y enlaza al disco", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "release:rg-1",
          kind: "artist_release",
          actors: [],
          actorCount: 0,
          target: {
            type: "release",
            releaseGroupId: "rg-1",
            title: "Disco nuevo",
            artistName: "Pink Floyd",
            category: "ep",
            releaseDate: "2026-10-20",
            coverUrl: null,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Salió Disco nuevo, el nuevo EP de Pink Floyd/ }),
    ).toHaveAttribute("href", albumHref("Pink Floyd", "Disco nuevo", "rg-1"));
  });

  it("un sencillo se redacta como sencillo", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "single:rg-2",
          kind: "artist_single",
          actors: [],
          actorCount: 0,
          target: {
            type: "release",
            releaseGroupId: "rg-2",
            title: "Canción",
            artistName: "Pink Floyd",
            category: "single",
            releaseDate: "2026-10-20",
            coverUrl: null,
          },
        })}
      />,
    );

    expect(
      screen.getByRole("link", { name: /Salió Canción, el nuevo sencillo de Pink Floyd/ }),
    ).toBeInTheDocument();
  });

  it("un anunciado con fecha la escribe en el idioma activo", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "announced:rg-3",
          kind: "artist_release_announced",
          actors: [],
          actorCount: 0,
          target: {
            type: "release",
            releaseGroupId: "rg-3",
            title: "Por salir",
            artistName: "Pink Floyd",
            category: "album",
            releaseDate: "2026-11-14",
            coverUrl: null,
          },
        })}
      />,
    );

    expect(
      screen.getByText("Pink Floyd anunció Por salir para el 14 de noviembre"),
    ).toBeInTheDocument();
  });

  it("un anunciado sin fecha exacta omite la fecha", () => {
    renderRow(
      <NotificationRow
        group={group({
          id: "announced:rg-4",
          kind: "artist_release_announced",
          actors: [],
          actorCount: 0,
          target: {
            type: "release",
            releaseGroupId: "rg-4",
            title: "Por salir",
            artistName: "Pink Floyd",
            category: "album",
            releaseDate: null,
            coverUrl: null,
          },
        })}
      />,
    );

    expect(screen.getByText("Pink Floyd anunció Por salir")).toBeInTheDocument();
  });

  it("anuncia las entradas sin leer a lectores de pantalla", () => {
    const { unmount } = renderRow(<NotificationRow group={group({})} />);
    expect(screen.getByText("(Sin leer)")).toBeInTheDocument();
    unmount();

    renderRow(<NotificationRow group={group({ unread: false })} />);
    expect(screen.queryByText("(Sin leer)")).not.toBeInTheDocument();
  });
});
