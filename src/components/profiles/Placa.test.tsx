import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Placa } from "./Placa";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("@/components/profiles/MutualFollowersRow", () => ({
  MutualFollowersRow: ({ username }: { username: string }) => (
    <div data-testid="mutual-followers-row">{username}</div>
  ),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) => {
    if (vars?.date) return `Miembro desde ${vars.date}`;
    if (vars?.time) return `${key}:${vars.time}`;
    return key;
  }),
  getFormatter: vi.fn().mockResolvedValue({ dateTime: () => "septiembre de 2025" }),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/components/social/FollowButton", () => ({
  FollowButton: ({ relation, preview }: { relation: string; preview?: boolean }) => (
    <div data-testid="follow-button" data-preview={preview ? "true" : undefined}>
      {relation}
    </div>
  ),
}));

vi.mock("@/components/social/BlockButton", () => ({
  BlockButton: () => <div data-testid="block-button" />,
}));

const base: ProfileView = {
  id: "u1",
  username: "ana",
  displayName: "Ana Torres",
  profileVisibility: "public",
  bio: null,
  pronouns: null,
  location: null,
  timezone: null,
  showLocalTime: false,
  selfRoles: [],
  genres: [],
  listeningFormats: [],
  prompts: [],
  avatarUrl: null,
  memberSince: new Date("2025-09-15T00:00:00Z"),
  links: [],
  followerCount: 12,
  followingCount: 8,
  relation: "none",
  accessible: true,
  blockedByMe: false,
  isOwner: false,
};

afterEach(() => vi.useRealTimers());

describe("Placa: ficha musical y hora local", () => {
  const withMusic = {
    ...base,
    selfRoles: ["collector", "dj"],
    genres: ["post-punk", "jazz"],
    listeningFormats: ["vinyl", "streaming"],
    prompts: [{ promptKey: "first-record", answer: "Un casete de Los Prisioneros", position: 0 }],
  } as ProfileView;

  it("perfil completo: la ficha muestra soy, géneros, escucho en y las preguntas", async () => {
    renderWithIntl(await Placa({ profile: withMusic, authenticated: true }));

    const ficha = screen.getByLabelText("musicIdentity.ficha.aria");
    expect(ficha).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.ficha.roles")).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.roles.collector · musicIdentity.roles.dj")).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.genres.post-punk · musicIdentity.genres.jazz")).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.formats.vinyl · musicIdentity.formats.streaming")).toBeInTheDocument();
    expect(screen.getByText("musicIdentity.prompts.first-record.short")).toBeInTheDocument();
    expect(screen.getByText("Un casete de Los Prisioneros")).toBeInTheDocument();
  });

  it("perfil sin datos nuevos: la Placa se ve como antes, sin ficha ni divisor vacío", async () => {
    const { container } = renderWithIntl(await Placa({ profile: base, authenticated: true }));
    expect(screen.queryByLabelText("musicIdentity.ficha.aria")).not.toBeInTheDocument();
    expect(container.querySelector("hr")).toBeNull();
  });

  it("solo géneros: la ficha muestra únicamente esa fila", async () => {
    renderWithIntl(
      await Placa({ profile: { ...base, genres: ["jazz"] } as ProfileView, authenticated: true }),
    );
    expect(screen.getByText("musicIdentity.ficha.genres")).toBeInTheDocument();
    expect(screen.queryByText("musicIdentity.ficha.roles")).not.toBeInTheDocument();
    expect(screen.queryByText("musicIdentity.ficha.formats")).not.toBeInTheDocument();
  });

  it("muestra la hora local junto a la ubicación cuando su dueño la activó", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-21T17:32:00Z"));
    renderWithIntl(
      await Placa({
        profile: { ...base, location: "Quilpué", timezone: "America/Santiago", showLocalTime: true } as ProfileView,
        authenticated: true,
      }),
    );
    expect(screen.getByText("Quilpué")).toBeInTheDocument();
    expect(screen.getByText("profileLocalTime:14:32")).toBeInTheDocument();
  });

  it("con la opción desactivada no muestra ninguna hora aunque haya zona", async () => {
    renderWithIntl(
      await Placa({
        profile: { ...base, timezone: "America/Santiago", showLocalTime: false } as ProfileView,
        authenticated: true,
      }),
    );
    expect(screen.queryByText(/profileLocalTime/)).not.toBeInTheDocument();
  });

  it("una zona inválida guardada no rompe la Placa ni muestra hora", async () => {
    renderWithIntl(
      await Placa({
        profile: { ...base, timezone: "hora de mi casa", showLocalTime: true } as ProfileView,
        authenticated: true,
      }),
    );
    expect(screen.queryByText(/profileLocalTime/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ana Torres" })).toBeInTheDocument();
  });
});

describe("Placa", () => {
  it("vista pública: identidad, contadores y botón de seguir", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: true }));
    expect(screen.getByRole("heading", { name: "Ana Torres" })).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText(/Miembro desde/)).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveTextContent("none");
  });

  it("muestra la identidad extendida: bio, pronombres, ubicación, enlaces y contadores", async () => {
    renderWithIntl(
      await Placa({
        profile: {
          ...base,
          profileVisibility: "private",
          accessible: false,
          bio: "Colecciono ediciones japonesas.",
          pronouns: "elle",
          location: "Rosario",
          links: [{ id: "l1", kind: "bandcamp", url: "https://ana.bandcamp.com", position: 0 }],
        },
        authenticated: true,
      }),
    );
    expect(screen.getByText("Colecciono ediciones japonesas.")).toBeInTheDocument();
    expect(screen.getByText("elle")).toBeInTheDocument();
    expect(screen.getByText("Rosario")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "linkAria" })).toHaveAttribute(
      "href",
      "https://ana.bandcamp.com",
    );
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("vista del dueño: sin botón de bloqueo", async () => {
    renderWithIntl(
      await Placa({
        profile: { ...base, relation: "self", isOwner: true },
        authenticated: true,
      }),
    );
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveTextContent("self");
  });

  it("visitante anónimo: sin botón de bloqueo", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: false }));
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
  });

  it("otro usuario autenticado: muestra el botón de bloqueo", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: true }));
    expect(screen.getByTestId("block-button")).toBeInTheDocument();
  });

  it("previsualización: pasa preview al FollowButton y oculta el bloqueo", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: true, preview: true }));
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-preview", "true");
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
  });

  it("los contadores enlazan a las vistas de conexiones", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: true }));
    expect(screen.getByText("12").closest("a")).toHaveAttribute(
      "href",
      "/users/ana/connections/followers",
    );
    expect(screen.getByText("8").closest("a")).toHaveAttribute(
      "href",
      "/users/ana/connections/following",
    );
  });

  it("sin seguidores en común: no renderiza la fila", async () => {
    renderWithIntl(await Placa({ profile: base, authenticated: true }));
    expect(screen.queryByTestId("mutual-followers-row")).not.toBeInTheDocument();
  });

  it("con seguidores en común: renderiza la fila", async () => {
    renderWithIntl(
      await Placa({
        profile: base,
        authenticated: true,
        mutualFollowers: {
          total: 3,
          first: { id: "u2", username: "leo", displayName: "Leo", profileVisibility: "public" },
        },
      }),
    );
    expect(screen.getByTestId("mutual-followers-row")).toHaveTextContent("ana");
  });
});
