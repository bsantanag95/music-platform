import { describe, it, expect, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { AlbumCover } from "./AlbumCover";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";

vi.mock("next/image", () => ({
  default: (props: { src: string; alt: string; onError?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.src}
      alt={props.alt}
      onError={() => props.onError?.()}
    />
  ),
}));

describe("AlbumCover", () => {
  it("muestra la carátula cuando está disponible", () => {
    renderWithIntl(
      <AlbumCover
        cover="https://coverartarchive.org/release-group/test/front-250"
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

  it("muestra el placeholder tras agotar reintentos de imagen", async () => {
    renderWithIntl(
      <AlbumCover
        cover="https://coverartarchive.org/release-group/test/front-250"
        coverLabel={catalogEs.album.coverLabel}
        coverPlaceholderAlt={catalogEs.album.coverPlaceholderAlt}
        coverFailed={catalogEs.album.coverFailed}
      />,
    );

    // Esperar a que la imagen se cargue
    await waitFor(() => {
      expect(screen.queryAllByRole("img").length).toBeGreaterThan(0);
    });

    // Simular 3 errores de imagen (MAX_IMAGE_RETRIES es 2, así que el tercer error activa el fallback)
    for (let i = 0; i < 3; i++) {
      const imgs = screen.queryAllByRole("img");
      if (imgs.length === 0) break;
      const img = imgs[0];
      if (img) fireEvent.error(img);
    }

    // Verificar que después de agotar reintentos se muestra el placeholder
    await waitFor(() => {
      const placeholders = screen.queryAllByRole("img");
      const hasFailedPlaceholder = placeholders.some(p => 
        p.getAttribute("aria-label") === catalogEs.album.coverFailed
      );
      expect(hasFailedPlaceholder).toBe(true);
    });
  });
});
