import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  kind: vi.fn(),
  tier: vi.fn(),
  top: vi.fn(),
  metadata: vi.fn(),
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
vi.mock("@/services/laminas/laminas", () => ({ getUserLamina: mocks.top, laminaKindById: mocks.kind }));
vi.mock("@/services/laminas/tiers", () => ({ getUserTierList: mocks.tier }));
vi.mock("@/services/share/metadata", () => ({ buildShareMetadata: mocks.metadata }));
vi.mock("@/i18n/client-messages", () => ({ withClientMessages: (_route: string, page: unknown) => page }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: ({ label }: { label: string }) => <span>{label}</span> }));
vi.mock("@/components/laminas/LaminaCta", () => ({ LaminaCta: () => <div>arma la tuya</div> }));
vi.mock("@/components/share/ShareAction", () => ({ ShareAction: ({ kind, refId }: { kind: string; refId: string }) => <button>{`compartir:${kind}:${refId}`}</button> }));

import UserLaminaPage, { generateMetadata } from "./page";

const ID = "20000000-0000-4000-8000-000000000001";
const item = (n: number, score: { stars: string; detailedScore: number | null } | null = null) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`,
  position: n,
  target: { id: `10000000-0000-4000-8000-00000000000${n}`, title: `Disco ${n}`, artistName: "Banda", coverThumbUrl: null },
  score,
});
const tierList = (over = {}) => ({
  id: ID,
  kind: "tier",
  title: "Tier list de Banda",
  entityType: "release-group",
  audience: "public",
  updatedAt: "2026-11-07T00:00:00.000Z",
  showScores: false,
  labels: ["Dios", "A", "B", "C", "D", "E"],
  tiers: [[item(1, { stars: "5", detailedScore: 96 })], [item(2)], [], [], [], []],
  tray: [],
  ...over,
});

const render = async () => renderWithIntl(await UserLaminaPage({ params: Promise.resolve({ username: "ana", id: ID }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.kind.mockResolvedValue("tier");
  mocks.tier.mockResolvedValue(tierList());
});

describe("página pública de una tier list", () => {
  it("muestra los seis niveles con sus etiquetas, sin la bandeja ni Arma la tuya", async () => {
    await render();
    expect(screen.getByRole("heading", { name: "Tier list de Banda" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Dios: 1 disco" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "E: vacío" })).toBeInTheDocument();
    expect(screen.queryByText("Sin escuchar / sin valorar")).not.toBeInTheDocument();
    expect(screen.queryByText("arma la tuya")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `compartir:tier:${ID}` })).toBeInTheDocument();
    expect(mocks.tier).toHaveBeenCalledWith("ana", ID, null);
    expect(mocks.top).not.toHaveBeenCalled();
  });

  it("con las notas apagadas no muestra ninguna", async () => {
    await render();
    expect(screen.queryByText("96")).not.toBeInTheDocument();
  });

  it("con las notas encendidas, cada disco lleva la suya", async () => {
    mocks.tier.mockResolvedValue(tierList({ showScores: true }));
    await render();
    expect(within(screen.getByRole("list", { name: "Dios: 1 disco" })).getByText("96")).toBeInTheDocument();
  });

  it("una de canciones enlaza a cada canción", async () => {
    mocks.tier.mockResolvedValue(tierList({ entityType: "recording" }));
    await render();
    expect(screen.getByTitle("Disco 1")).toHaveAttribute("href", expect.stringMatching(/^\/song\//));
  });

  it("el dueño llega a su editor", async () => {
    mocks.session.mockResolvedValue({ user: { id: "u1", username: "ana" } });
    await render();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute("href", `/me/laminas/${ID}`);
  });

  it("una que no se puede ver responde 404", async () => {
    mocks.tier.mockRejectedValue(new ApiError("LAMINA_NOT_FOUND", 404, "x"));
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("los metadatos son los de la tier list", async () => {
    await generateMetadata({ params: Promise.resolve({ username: "ana", id: ID }) });
    expect(mocks.metadata).toHaveBeenCalledWith("tier", ID, "es", { withTitle: true });
  });
});
