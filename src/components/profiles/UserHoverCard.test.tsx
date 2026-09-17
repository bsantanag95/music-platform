import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import usersEs from "../../../messages/es/users.json";
import { UserHoverCard } from "./UserHoverCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }));

function basePreview(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "u1",
    username: "default",
    displayName: null,
    bio: null,
    relation: "none",
    viewerAuthenticated: true,
    accessible: true,
    identityCard: { artist: null, album: null, anthem: null },
    ...overrides,
  };
}

function renderCard(username: string) {
  return render(
    <NextIntlClientProvider locale="es" messages={{ users: usersEs }}>
      <UserHoverCard username={username}>
        <span>@{username}</span>
      </UserHoverCard>
    </NextIntlClientProvider>,
  );
}

async function hover(username: string) {
  fireEvent.mouseEnter(screen.getByText(`@${username}`).parentElement!);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mocks.apiFetch.mockResolvedValue({ preview: basePreview() });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("UserHoverCard", () => {
  it("no dispara el fetch hasta pasar el cursor (delay de apertura)", async () => {
    renderCard("ana1");
    fireEvent.mouseEnter(screen.getByText("@ana1").parentElement!);
    expect(mocks.apiFetch).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/api/users/ana1/identity-card-preview",
      expect.anything(),
    );
  });

  it("muestra los 3 elementos de la Tarjeta de Identidad al abrir", async () => {
    mocks.apiFetch.mockResolvedValue({
      preview: basePreview({
        username: "ana2",
        displayName: "Ana",
        identityCard: {
          artist: { type: "artist", id: "a1", title: "Radiohead", artistName: null, coverThumbUrl: null },
          album: {
            type: "release-group",
            id: "rg1",
            title: "Blonde",
            artistName: "Frank Ocean",
            coverThumbUrl: null,
          },
          anthem: { type: "recording", id: "rec1", title: "Idioteque", artistName: "Radiohead", coverThumbUrl: null },
        },
      }),
    });

    renderCard("ana2");
    await hover("ana2");

    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Blonde")).toBeInTheDocument();
    expect(screen.getByText("Idioteque")).toBeInTheDocument();
  });

  it("un título largo no desborda el popover ni choca con las columnas vecinas", async () => {
    // Regresión (2 bugs reales encontrados en producción, mismo síntoma con
    // causas distintas):
    // 1. El link de cada slot (flex item de una fila `flex-1`) sin `min-w-0`
    //    no se encoge por debajo del ancho de su título con `truncate`
    //    (`white-space: nowrap`) — esa columna se salía del borde del popover.
    // 2. Arreglado (1), el título seguía "chocando" con las columnas vecinas:
    //    el `<Link>` de cada slot es `flex-col items-center` — `items-center`
    //    alinea por contenido (no estira al 100% del ancho), así que el
    //    `<span>` que envuelve el título no quedaba acotado a los ~77px de su
    //    columna pese a tener `min-w-0` — hacía falta además `w-full` en ese
    //    span para que `truncate` tuviera un ancho real contra el cual recortar.
    mocks.apiFetch.mockResolvedValue({
      preview: basePreview({
        username: "ana8",
        identityCard: {
          artist: null,
          album: null,
          anthem: {
            type: "recording",
            id: "rec1",
            title: "Un título de canción bastante más largo que el resto",
            artistName: null,
            coverThumbUrl: null,
          },
        },
      }),
    });

    renderCard("ana8");
    await hover("ana8");

    const title = screen.getByText("Un título de canción bastante más largo que el resto");
    expect(title.className).toMatch(/truncate/);
    const slotLink = title.closest("a")!;
    expect(slotLink.className).toMatch(/min-w-0/);
    const textWrapper = title.parentElement!;
    expect(textWrapper.className).toMatch(/w-full/);
    expect(textWrapper.className).toMatch(/min-w-0/);
  });

  it("perfil privado sin acceso: no muestra la tarjeta, solo el aviso — pero sí el encabezado y la bio", async () => {
    mocks.apiFetch.mockResolvedValue({
      preview: basePreview({ username: "ana3", displayName: "Ana", bio: "Escucho de todo.", accessible: false, identityCard: null }),
    });

    renderCard("ana3");
    await hover("ana3");

    expect(screen.getByText("Este perfil es privado")).toBeInTheDocument();
    expect(screen.getByText("Escucho de todo.")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("cierra al sacar el cursor antes de que se cumpla el delay de apertura", async () => {
    renderCard("ana4");
    const trigger = screen.getByText("@ana4").parentElement!;
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("recorta la bio a 2 líneas (hasta 200 caracteres permitidos) para no inflar el popover", async () => {
    const longBio = "a".repeat(200);
    mocks.apiFetch.mockResolvedValue({
      preview: basePreview({ username: "ana5", bio: longBio }),
    });

    renderCard("ana5");
    await hover("ana5");

    expect(screen.getByText(longBio).className).toMatch(/line-clamp-2/);
  });

  it("muestra el botón Seguir cuando el visitante tiene sesión y no sigue a la persona", async () => {
    mocks.apiFetch.mockResolvedValue({
      preview: basePreview({ username: "ana6", relation: "none", viewerAuthenticated: true }),
    });

    renderCard("ana6");
    await hover("ana6");

    expect(screen.getByRole("button", { name: "Seguir" })).toBeInTheDocument();
  });

  it("sin sesión ofrece iniciar sesión para seguir en vez del botón", async () => {
    mocks.apiFetch.mockResolvedValue({
      preview: basePreview({ username: "ana7", relation: "none", viewerAuthenticated: false }),
    });

    renderCard("ana7");
    await hover("ana7");

    expect(screen.getByText("Iniciar sesión para seguir")).toBeInTheDocument();
  });
});
