import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import catalogEs from "../../../messages/es/catalog.json";
import { EditionExtraTracks, type ExtraTracksVariant } from "./EditionExtraTracks";

const mocks = vi.hoisted(() => ({ getEditionExtraTracks: vi.fn() }));
vi.mock("@/lib/api/catalog", () => ({ getEditionExtraTracks: mocks.getEditionExtraTracks }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const extraEs = catalogEs.album.extraTracks;

function variant(editionId: string, overrides: Partial<ExtraTracksVariant> = {}): ExtraTracksVariant {
  return {
    editionId,
    editionMbid: `${editionId}-mbid`,
    name: "Experience Edition",
    year: 2011,
    labels: ["EMI"],
    formats: ["CD", "CD"],
    countries: ["GB", "US"],
    editionCount: 2,
    estimatedExtraTracks: 9,
    isBox: false,
    totalTracks: 19,
    ...overrides,
  };
}

function renderSections(variants: ExtraTracksVariant[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="es" messages={{ catalog: catalogEs }}>
        <EditionExtraTracks releaseGroupId="rg-1" variants={variants} />
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
});

describe("EditionExtraTracks", () => {
  it("no muestra nada sin variantes", () => {
    const { container } = renderSections([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra las secciones contraídas, con la frase aclaratoria y la edición identificada", () => {
    renderSections([variant("exp")]);
    expect(screen.getByText(extraEs.intro)).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /Experience Edition/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("2011 · EMI · 2×CD · 2 ediciones (GB, US)")).toBeInTheDocument();
    expect(screen.getByText("+9 pistas")).toBeInTheDocument();
    expect(mocks.getEditionExtraTracks).not.toHaveBeenCalled();
  });

  it("al desplegar pide las pistas y muestra solo las adicionales", async () => {
    mocks.getEditionExtraTracks.mockResolvedValue({
      tracks: [
        { recordingId: "r-live", discNumber: 2, position: 1, title: "Money (Live)", durationSec: 400, variantType: "live" },
      ],
    });
    renderSections([variant("exp")]);
    fireEvent.click(screen.getByRole("button", { name: /Experience Edition/ }));

    await waitFor(() => expect(screen.getByRole("link", { name: "Money (Live)" })).toHaveAttribute("href", "/song/r-live"));
    expect(mocks.getEditionExtraTracks).toHaveBeenCalledWith("rg-1", "exp");
    expect(screen.getByText("2-1")).toBeInTheDocument();
    expect(screen.getByText(catalogEs.album.tracks.variant.live)).toBeInTheDocument();
  });

  it("muestra un error con reintento si falla la carga", async () => {
    mocks.getEditionExtraTracks.mockRejectedValue(new Error("red"));
    renderSections([variant("exp")]);
    fireEvent.click(screen.getByRole("button", { name: /Experience Edition/ }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(extraEs.loadError));
  });

  it("rotula una caja y enlaza a MusicBrainz sin desplegar", () => {
    renderSections([variant("box", { name: "Immersion box set", isBox: true, totalTracks: 193 })]);
    expect(screen.getByText("Caja · 193 pistas")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver la lista en MusicBrainz/ })).toHaveAttribute(
      "href",
      "https://musicbrainz.org/release/box-mbid",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("usa el nombre de fallback cuando la edición no tiene nombre propio", () => {
    renderSections([variant("exp", { name: null })]);
    expect(screen.getByRole("button", { name: /Edición 2011 · 2×CD/ })).toBeInTheDocument();
  });

  it("abre la sección que viene en el hash (desde la pestaña Ediciones)", async () => {
    mocks.getEditionExtraTracks.mockResolvedValue({ tracks: [] });
    window.location.hash = "#variant-exp";
    Element.prototype.scrollIntoView = vi.fn();
    renderSections([variant("exp")]);
    await waitFor(() => expect(screen.getByRole("button", { name: /Experience Edition/ })).toHaveAttribute("aria-expanded", "true"));
    await waitFor(() => expect(screen.getByText(extraEs.empty)).toBeInTheDocument());
  });
});
