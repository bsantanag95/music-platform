import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import type { DiscoverListSummary } from "@/lib/api/schemas";
import { FeaturedExhibit } from "./FeaturedExhibit";
import { ListsBand } from "./ListsSignUpBand";

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("es"),
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values && "count" in values ? `${key}:${String(values.count)}` : key,
  ),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({ DiscPlaceholder: () => <span data-testid="disc" /> }));
vi.mock("./SaveListButton", () => ({ SaveListButton: () => <button type="button">Guardar</button> }));

const list = (over: Partial<DiscoverListSummary> = {}): DiscoverListSummary =>
  ({
    id: "f1",
    entityType: "recording",
    title: "Playlist de fondo",
    description: "Para trabajar sin perder el hilo.",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    itemCount: 5,
    coverThumbs: ["a", "b", "c", "d", "e"],
    owner: { id: "o", username: "exploracion", displayName: "Exploración" },
    isOfficial: true,
    saved: false,
    following: false,
    isOwn: false,
    generated: null,
    saveCount: 23,
    ...over,
  }) as DiscoverListSummary;
const item = (n: number) => ({ id: `i${n}`, position: n, target: { id: `t${n}`, title: `Canción ${n}`, artistName: `Artista ${n}`, coverThumbUrl: null } });

describe("FeaturedExhibit (openspec: redesign-lists-phase3)", () => {
  it("exhibidor: cuatro fundas, insignia, título enlazado, descripción, primeros cuatro elementos y acciones", async () => {
    render(await FeaturedExhibit({ list: list(), items: [1, 2, 3, 4, 5].map(item), canSave: true }));

    expect(screen.getAllByTestId("cover")).toHaveLength(4);
    expect(screen.getByText("officialBadge")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Playlist de fondo" })).toBeInTheDocument();
    expect(screen.getByText("Para trabajar sin perder el hilo.")).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent("Canción 1Artista 1");
    // El cuarto se oculta en el teléfono.
    expect(items[3]!.className).toContain("max-sm:hidden");
    expect(screen.getByRole("link", { name: "community.reader.open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByText("itemsCount:5 · savesCount:23")).toBeInTheDocument();
  });

  it("sin elementos ni carátulas: se muestra igual, con la silueta del disco y sin lista numerada", async () => {
    render(await FeaturedExhibit({ list: list({ coverThumbs: [] }), items: null, canSave: false }));

    expect(screen.getByTestId("disc")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });

  it("compacto: un solo enlace con abanico de tres, título, tipo y conteo", async () => {
    render(await FeaturedExhibit({ list: list(), canSave: true, compact: true }));

    const link = screen.getByRole("link");
    expect(link).toHaveTextContent("Playlist de fondo");
    expect(link).toHaveTextContent("itemsCount:5");
    expect(screen.getAllByTestId("cover")).toHaveLength(3);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("ListsBand", () => {
  it("título, frase, acción principal y secundaria, con la pila de fundas solo si hay carátulas", () => {
    const { rerender } = render(
      <ListsBand
        headingId="b"
        title="Arma tus propias listas"
        description="Con una cuenta…"
        primary={{ href: "/auth/register", label: "Crear cuenta" }}
        secondary={{ href: "/auth/login", label: "Ya tengo cuenta" }}
        covers={["a", "b", "c", "d"]}
      />,
    );
    expect(screen.getByRole("region", { name: "Arma tus propias listas" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute("href", "/auth/register");
    expect(screen.getAllByTestId("cover")).toHaveLength(3);

    rerender(<ListsBand headingId="b" title="Vacío" description="…" primary={{ href: "/x", label: "Crear" }} />);
    expect(screen.queryAllByTestId("cover")).toHaveLength(0);
  });
});
