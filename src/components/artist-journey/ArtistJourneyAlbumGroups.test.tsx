import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ArtistJourneyAlbumGroups, type ArtistJourneyGroupableAlbum } from "./ArtistJourneyAlbumGroups";

const categoryLabels = {
  studio: "Estudio",
  single_ep: "Sencillos / EP",
  compilation: "Compilados",
  live_other: "En vivo / Misceláneo",
};

const albums: ArtistJourneyGroupableAlbum[] = [
  { id: "s1", title: "Máquina", category: "studio", firstReleaseYear: 1990 },
  { id: "s2", title: "Fireball", category: "studio", firstReleaseYear: 1971 },
  { id: "l1", title: "Made in Japan", category: "live_other", firstReleaseYear: 1972 },
];

function renderGroups(over: Partial<Parameters<typeof ArtistJourneyAlbumGroups>[0]> = {}) {
  return renderWithIntl(
    <ArtistJourneyAlbumGroups
      albums={albums}
      selected={new Set()}
      collapsed={new Set(["single_ep", "compilation", "live_other"])}
      categoryLabels={categoryLabels}
      onToggleAlbum={vi.fn()}
      onToggleCategory={vi.fn()}
      onToggleCollapsed={vi.fn()}
      {...over}
    />,
  );
}

describe("ArtistJourneyAlbumGroups", () => {
  it("busca por título sin distinguir diacríticos", async () => {
    const user = userEvent.setup();
    renderGroups();
    await user.type(screen.getByRole("searchbox", { name: "Buscar álbum" }), "maquina");
    expect(screen.getByText("Máquina")).toBeInTheDocument();
    expect(screen.queryByText("Fireball")).not.toBeInTheDocument();
  });

  it("expande un grupo colapsado que tiene una coincidencia, sin tocar el colapso guardado", async () => {
    const onToggleCollapsed = vi.fn();
    const user = userEvent.setup();
    renderGroups({ onToggleCollapsed });
    await user.type(screen.getByRole("searchbox", { name: "Buscar álbum" }), "made in");
    expect(screen.getByText("Made in Japan")).toBeInTheDocument();
    expect(onToggleCollapsed).not.toHaveBeenCalled();
  });

  it("oculta los grupos sin ninguna coincidencia", async () => {
    const user = userEvent.setup();
    renderGroups();
    await user.type(screen.getByRole("searchbox", { name: "Buscar álbum" }), "fireball");
    expect(screen.queryByText("En vivo / Misceláneo")).not.toBeInTheDocument();
  });

  it("vaciar la búsqueda restaura el colapso previo", async () => {
    const user = userEvent.setup();
    renderGroups();
    const search = screen.getByRole("searchbox", { name: "Buscar álbum" });
    await user.type(search, "made in");
    expect(screen.getByText("Made in Japan")).toBeInTheDocument();
    await user.clear(search);
    expect(screen.queryByText("Made in Japan")).not.toBeInTheDocument();
  });

  it("muestra un estado vacío cuando no hay coincidencias", async () => {
    const user = userEvent.setup();
    renderGroups();
    await user.type(screen.getByRole("searchbox", { name: "Buscar álbum" }), "queen");
    expect(screen.getByText("Ningún álbum coincide con esa búsqueda.")).toBeInTheDocument();
  });

  it("'Seleccionar todo' sigue aplicando al grupo completo durante una búsqueda activa", async () => {
    const onToggleCategory = vi.fn();
    const user = userEvent.setup();
    renderGroups({ onToggleCategory });
    await user.type(screen.getByRole("searchbox", { name: "Buscar álbum" }), "fireball");
    const group = screen.getByText("Estudio").closest("div")!.parentElement!;
    await user.click(within(group).getByRole("checkbox", { name: /seleccionar todos/i }));
    expect(onToggleCategory).toHaveBeenCalledWith(["s1", "s2"], false);
  });
});
