import { describe, expect, it, vi } from "vitest";
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FavoriteActions } from "./FavoriteActions";
import { FavoriteUndoToast, UNDO_TOAST_MS } from "./FavoriteUndoToast";
import type { Favorite } from "@/lib/api/schemas";

// openspec: redesign-favorites-views

const favorite: Favorite = {
  id: "00000000-0000-4000-8000-000000000001",
  targetType: "release-group",
  audience: "followers",
  createdAt: "2026-02-01T00:00:00.000Z",
  target: { id: "t1", title: "The Wall", coverThumbUrl: null },
};

function renderActions(extra: Partial<Parameters<typeof FavoriteActions>[0]> = {}) {
  const onAudienceChange = vi.fn();
  const onRemove = vi.fn();
  renderWithIntl(
    <FavoriteActions favorite={favorite} onAudienceChange={onAudienceChange} onRemove={onRemove} {...extra} />,
  );
  return { onAudienceChange, onRemove };
}

const trigger = () => screen.getByRole("button", { name: /^Acciones de The Wall/ });
const badge = () => screen.getByRole("button", { name: /Audiencia: Seguidores/ });

describe("FavoriteActions", () => {
  it("muestra la insignia con la audiencia vigente y el botón ⋯, ambos como disparadores de menú", () => {
    renderActions();
    expect(badge()).toHaveTextContent("Seguidores");
    expect(badge()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("el menú lista las tres audiencias con la vigente marcada y 'Quitar favorito'", async () => {
    renderActions();
    await userEvent.click(badge());
    const menu = screen.getByRole("menu");
    const radios = within(menu).getAllByRole("menuitemradio");
    expect(radios.map((item) => item.textContent?.replace("✓", "").trim())).toEqual(["Público", "Seguidores", "Privado"]);
    expect(within(menu).getByRole("menuitemradio", { name: /Seguidores/ })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitem", { name: "Quitar favorito" })).toBeInTheDocument();
    expect(badge()).toHaveAttribute("aria-expanded", "true");
  });

  it("elegir una audiencia la notifica y cierra el menú", async () => {
    const { onAudienceChange } = renderActions();
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Público" }));
    expect(onAudienceChange).toHaveBeenCalledWith(favorite, "public");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("'Quitar favorito' notifica y cierra el menú", async () => {
    const { onRemove } = renderActions();
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("menuitem", { name: "Quitar favorito" }));
    expect(onRemove).toHaveBeenCalledWith(favorite);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Escape cierra el menú y devuelve el foco al disparador", async () => {
    renderActions();
    await userEvent.click(trigger());
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("un clic fuera cierra el menú", async () => {
    renderWithIntl(
      <div>
        <button type="button">Fuera</button>
        <FavoriteActions favorite={favorite} onAudienceChange={vi.fn()} onRemove={vi.fn()} />
      </div>,
    );
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole("button", { name: "Fuera" }));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("al abrir enfoca la primera opción y las flechas se mueven entre opciones", async () => {
    renderActions();
    await userEvent.click(trigger());
    const items = [...screen.getByRole("menu").querySelectorAll<HTMLElement>('[role^="menuitem"]')];
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(items[items.length - 1]).toHaveFocus();
  });

  it("sin insignia (Gráfico) solo hay el botón ⋯", () => {
    renderActions({ showBadge: false });
    expect(screen.queryByRole("button", { name: /Audiencia: Seguidores/ })).not.toBeInTheDocument();
    expect(trigger()).toBeInTheDocument();
  });

  it("ocupado deshabilita los disparadores", () => {
    renderActions({ busy: true });
    expect(trigger()).toBeDisabled();
    expect(badge()).toBeDisabled();
  });

  it("los disparadores y las opciones llevan las clases táctiles", async () => {
    renderActions();
    expect(badge().className).toContain("[@media(pointer:coarse)]:min-h-11");
    expect(trigger().className).toContain("[@media(pointer:coarse)]:size-11");
    await userEvent.click(trigger());
    for (const item of [...screen.getByRole("menu").querySelectorAll<HTMLElement>('[role^="menuitem"]')]) {
      expect(item.className).toContain("[@media(pointer:coarse)]:min-h-11");
    }
  });
});

describe("FavoriteUndoToast", () => {
  it("anuncia 'Quitado de favoritos' con rol status y la acción 'Deshacer'", async () => {
    const onUndo = vi.fn();
    renderWithIntl(<FavoriteUndoToast onUndo={onUndo} onExpire={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Quitado de favoritos");
    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("expira solo tras el tiempo de gracia", () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    renderWithIntl(<FavoriteUndoToast onUndo={vi.fn()} onExpire={onExpire} />);
    act(() => void vi.advanceTimersByTime(UNDO_TOAST_MS - 1));
    expect(onExpire).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(2));
    expect(onExpire).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

