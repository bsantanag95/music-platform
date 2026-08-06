import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AlbumCover } from "./AlbumCover";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

describe("AlbumCover", () => {
  it("muestra la carátula cuando está disponible", () => {
    renderWithIntl(
      <AlbumCover
        cover="https://coverartarchive.org/release/test/front-250"
        coverLabel={catalogEs.album.coverLabel}
        coverPlaceholderAlt={catalogEs.album.coverPlaceholderAlt}
      />,
    );

    expect(screen.getByRole("img", { name: catalogEs.album.coverLabel })).toBeInTheDocument();
  });

  it("muestra el placeholder cuando no hay carátula", () => {
    renderWithIntl(
      <AlbumCover
        cover={null}
        coverLabel={catalogEs.album.coverLabel}
        coverPlaceholderAlt={catalogEs.album.coverPlaceholderAlt}
      />,
    );

    expect(screen.getByRole("img", { name: catalogEs.album.coverPlaceholderAlt })).toBeInTheDocument();
  });

  it("el placeholder es accesible", () => {
    renderWithIntl(
      <AlbumCover
        cover={null}
        coverLabel={catalogEs.album.coverLabel}
        coverPlaceholderAlt={catalogEs.album.coverPlaceholderAlt}
      />,
    );

    const placeholder = screen.getByRole("img", { name: catalogEs.album.coverPlaceholderAlt });
    expect(placeholder).toBeInTheDocument();
  });
});
