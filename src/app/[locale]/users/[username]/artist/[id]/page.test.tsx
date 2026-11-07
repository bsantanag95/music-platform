import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  lamina: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const messages = (await import("../../../../../../../messages/es/laminas.json")).default;
  return {
    getLocale: vi.fn().mockResolvedValue("es"),
    getTranslations: vi.fn(async (namespace: string) => createTranslator({ locale: "es", messages: { laminas: messages }, namespace: namespace as "laminas" })),
  };
});
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.session }));
vi.mock("@/services/laminas/discography", () => ({ getDiscographyLamina: mocks.lamina }));
vi.mock("@/services/share/metadata", () => ({ buildShareMetadata: vi.fn() }));
vi.mock("@/services/share/targets/discography", () => ({
  discographyRef: (userId: string, artistId: string) => `${userId}.${artistId}`,
  discographyRefFor: vi.fn(),
}));
vi.mock("@/i18n/client-messages", () => ({ withClientMessages: (_route: string, page: unknown) => page }));
vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));
vi.mock("@/components/share/OwnShareSheet", () => ({ OwnShareButton: ({ refId }: { refId: string }) => <button>{`propio:${refId}`}</button> }));
vi.mock("@/components/share/ShareAction", () => ({ ShareAction: ({ refId }: { refId: string }) => <button>{`publico:${refId}`}</button> }));

import UserDiscographyPage from "./page";

const ARTIST = "10000000-0000-4000-8000-000000000001";
const disc = (n: number, stars: number, detailedScore: number | null = null) => ({ id: `d${n}`, title: `Disco ${n}`, year: 1980 + n, coverThumbUrl: null, stars, detailedScore });
const lamina = (over = {}) => ({
  owner: { id: "u1", username: "ana", displayName: null },
  artist: { id: ARTIST, name: "Banda" },
  discs: [disc(1, 4.5, 86), disc(2, 4), disc(3, 3)],
  progress: { kind: "rated", count: 3 },
  missing: 0,
  isOwner: false,
  shared: false,
  ...over,
});

const render = async () =>
  renderWithIntl(await UserDiscographyPage({ params: Promise.resolve({ username: "ana", id: ARTIST }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.lamina.mockResolvedValue(lamina());
});

describe("discografía de una persona", () => {
  it("responde 404 si quien mira no la puede ver", async () => {
    mocks.lamina.mockResolvedValue(null);
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("muestra cada nota real: el número si existe y, si no, las estrellas", async () => {
    await render();
    expect(screen.getByText("86")).toBeTruthy();
    expect(screen.getByText("4★")).toBeTruthy();
  });

  it("sin Recorrido dice cuántos discos valoró, sin total", async () => {
    await render();
    expect(screen.getByText("3 discos valorados")).toBeTruthy();
  });

  it("con Recorrido, la barra sin números", async () => {
    mocks.lamina.mockResolvedValue(lamina({ progress: { kind: "journey", percent: 50 } }));
    await render();
    expect(screen.getByRole("img", { name: /a la mitad/ })).toBeTruthy();
    expect(screen.queryByText(/de \d+/)).toBeNull();
  });

  it("el dueño comparte con el gesto", async () => {
    mocks.lamina.mockResolvedValue(lamina({ isOwner: true }));
    await render();
    expect(screen.getByRole("button", { name: `propio:u1.${ARTIST}` })).toBeTruthy();
  });

  it("una seguidora sin marca no tiene botón; con marca, el público", async () => {
    await render();
    expect(screen.queryByRole("button")).toBeNull();
    mocks.lamina.mockResolvedValue(lamina({ shared: true }));
    await render();
    expect(screen.getByRole("button", { name: `publico:u1.${ARTIST}` })).toBeTruthy();
  });

  it("al dueño le dice cuánto falta y no ofrece compartir", async () => {
    mocks.lamina.mockResolvedValue(lamina({ isOwner: true, missing: 1, discs: [disc(1, 4), disc(2, 3)] }));
    await render();
    expect(screen.getByText(/Te falta 1 disco valorado/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
