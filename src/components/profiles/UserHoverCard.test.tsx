import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import usersEs from "../../../messages/es/users.json";
import { UserHoverCard } from "./UserHoverCard";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch }));

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
  mocks.apiFetch.mockResolvedValue({
    preview: { username: "default", displayName: null, accessible: true, identityCard: { artist: null, album: null, anthem: null } },
  });
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
      preview: {
        username: "ana2",
        displayName: "Ana",
        accessible: true,
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
      },
    });

    renderCard("ana2");
    await hover("ana2");

    expect(screen.getByText("Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Blonde")).toBeInTheDocument();
    expect(screen.getByText("Idioteque")).toBeInTheDocument();
  });

  it("perfil privado sin acceso: no muestra la tarjeta, solo el aviso", async () => {
    mocks.apiFetch.mockResolvedValue({
      preview: { username: "ana3", displayName: "Ana", accessible: false, identityCard: null },
    });

    renderCard("ana3");
    await hover("ana3");

    expect(screen.getByText("Este perfil es privado")).toBeInTheDocument();
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
});
