import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CollectionDetailHeader } from "./CollectionDetailHeader";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={`/es${href}`}>{children}</a>,
}));
vi.mock("@/components/lists/SaveListButton", () => ({ SaveListButton: () => <button type="button">Guardar</button> }));
vi.mock("@/components/camino/TrackListButton", () => ({ TrackListButton: () => <button type="button">Camino</button> }));

const list = {
  id: "00000000-0000-4000-8000-000000000001",
  entityType: "release-group" as const,
  title: "Ganadores del Grammy 2025",
  description: null,
  itemCount: 10,
  coverThumbs: ["https://coverartarchive.org/a.jpg", "https://coverartarchive.org/b.jpg"],
};

describe("CollectionDetailHeader", () => {
  it("muestra título, familia como sello, la plataforma como texto y el conteo de álbumes", () => {
    renderWithIntl(<CollectionDetailHeader list={list} family="awards" platformName="Exploración" />);

    expect(screen.getByRole("heading", { level: 1, name: "Ganadores del Grammy 2025" })).toBeInTheDocument();
    expect(screen.getByText("Premios")).toBeInTheDocument();
    expect(screen.getByText("Exploración")).toBeInTheDocument();
    expect(screen.getByText("10 álbumes")).toBeInTheDocument();
    // La plataforma es texto, no un perfil.
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("no lleva lo propio de una lista de persona: ni «por», ni audiencia, ni antigüedad", () => {
    renderWithIntl(<CollectionDetailHeader list={list} family="awards" platformName="Exploración" />);

    expect(screen.queryByText(/^por /)).toBeNull();
    expect(screen.queryByText("Pública")).toBeNull();
    expect(screen.queryByText(/hace /)).toBeNull();
  });

  it("en inglés traduce la familia y el conteo", () => {
    renderWithIntl(<CollectionDetailHeader list={list} family="rankings" platformName="Explore" />, "en");

    expect(screen.getByText("What people rate highest")).toBeInTheDocument();
    expect(screen.getByText("10 albums")).toBeInTheDocument();
  });

  it("muestra la descripción y las guardadas solo si existen", () => {
    renderWithIntl(
      <CollectionDetailHeader list={{ ...list, description: "Los que ganaron" }} family="awards" platformName="Exploración" saveCount={3} />,
    );

    expect(screen.getByText("Los que ganaron")).toBeInTheDocument();
    expect(screen.getByText("3 guardados")).toBeInTheDocument();
  });

  it("Guardar y el seguimiento solo con sesión", () => {
    const view = renderWithIntl(<CollectionDetailHeader list={list} family="awards" platformName="Exploración" />);
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
    view.unmount();

    renderWithIntl(<CollectionDetailHeader list={list} family="awards" platformName="Exploración" canSave />);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Camino" })).toBeInTheDocument();
  });

  it("con contexto, lo muestra en lugar de la descripción de la familia y enlaza a la ceremonia", () => {
    renderWithIntl(
      <CollectionDetailHeader
        list={list}
        family="awards"
        platformName="Exploración"
        context={{ text: "Los discos ganadores de los premios Grammy 2025.", link: { href: "/awards/grammy/2025", label: "Ver la ceremonia completa" } }}
      />,
    );

    expect(screen.getByText("Los discos ganadores de los premios Grammy 2025.")).toBeInTheDocument();
    expect(screen.queryByText(/ceremonias que sigue la plataforma/)).toBeNull();
    expect(screen.getByRole("link", { name: /Ver la ceremonia completa/ })).toHaveAttribute("href", "/es/awards/grammy/2025");
  });

  it("una descripción curada manda sobre el contexto", () => {
    renderWithIntl(
      <CollectionDetailHeader list={{ ...list, description: "Mi texto" }} family="awards" platformName="Exploración" context={{ text: "Contexto" }} />,
    );

    expect(screen.getByText("Mi texto")).toBeInTheDocument();
    expect(screen.queryByText("Contexto")).toBeNull();
  });
});
