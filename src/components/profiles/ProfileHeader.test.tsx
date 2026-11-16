import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { getLocale } from "next-intl/server";
import { ProfileHeader } from "./ProfileHeader";
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
  pronounSet: null,
  country: null,
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

describe("ProfileHeader: hora local", () => {
  it("muestra la hora local junto a la ubicación cuando su dueño la activó", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-21T17:32:00Z"));
    renderWithIntl(
      await ProfileHeader({
        profile: { ...base, location: "Quilpué", timezone: "America/Santiago", showLocalTime: true } as ProfileView,
        authenticated: true,
      }),
    );
    expect(screen.getByText("Quilpué")).toBeInTheDocument();
    expect(screen.getByText("profileLocalTime:14:32")).toBeInTheDocument();
  });

  it("con la opción desactivada no muestra ninguna hora aunque haya zona", async () => {
    renderWithIntl(
      await ProfileHeader({
        profile: { ...base, timezone: "America/Santiago", showLocalTime: false } as ProfileView,
        authenticated: true,
      }),
    );
    expect(screen.queryByText(/profileLocalTime/)).not.toBeInTheDocument();
  });

  it("una zona inválida guardada no rompe la cabecera ni muestra hora", async () => {
    renderWithIntl(
      await ProfileHeader({
        profile: { ...base, timezone: "hora de mi casa", showLocalTime: true } as ProfileView,
        authenticated: true,
      }),
    );
    expect(screen.queryByText(/profileLocalTime/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ana Torres" })).toBeInTheDocument();
  });
});

describe("ProfileHeader", () => {
  it("vista pública: identidad, contadores y botón de seguir", async () => {
    renderWithIntl(await ProfileHeader({ profile: base, authenticated: true }));
    expect(screen.getByRole("heading", { name: "Ana Torres" })).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText(/Miembro desde/)).toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveTextContent("none");
  });

  it("muestra la identidad extendida: bio, pronombres, ubicación, enlaces y contadores", async () => {
    renderWithIntl(
      await ProfileHeader({
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

  it("muestra «Ciudad, País» con el país en el idioma de la ruta, y los pronombres de la lista como etiqueta", async () => {
    renderWithIntl(
      await ProfileHeader({
        profile: { ...base, location: "Santiago", country: "CL", pronounSet: "she" },
        authenticated: true,
      }),
    );
    expect(screen.getByText("Santiago, Chile")).toBeInTheDocument();
    // El traductor de este test devuelve la clave: la etiqueta sale de `users.pronounSet.she`.
    expect(screen.getByText("pronounSet.she")).toBeInTheDocument();
  });

  it("el nombre del país sigue el idioma de la ruta (Spain en inglés)", async () => {
    vi.mocked(getLocale).mockResolvedValueOnce("en");
    renderWithIntl(
      await ProfileHeader({ profile: { ...base, location: "Madrid", country: "ES" }, authenticated: true }),
      "en",
    );
    expect(screen.getByText("Madrid, Spain")).toBeInTheDocument();
  });

  it("sin país, ciudad ni pronombres la cabecera no dibuja etiqueta ni ubicación", async () => {
    renderWithIntl(await ProfileHeader({ profile: base, authenticated: true }));
    expect(screen.queryByText(/^pronounSet\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/·.*Miembro/)).not.toBeInTheDocument();
    expect(screen.getByText(/^Miembro desde/)).toBeInTheDocument();
  });

  it("vista del dueño: sin botón de bloqueo", async () => {
    renderWithIntl(
      await ProfileHeader({
        profile: { ...base, relation: "self", isOwner: true },
        authenticated: true,
      }),
    );
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("follow-button")).toHaveTextContent("self");
  });

  it("visitante anónimo: sin botón de bloqueo", async () => {
    renderWithIntl(await ProfileHeader({ profile: base, authenticated: false }));
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
  });

  it("otro usuario autenticado: muestra el botón de bloqueo", async () => {
    renderWithIntl(await ProfileHeader({ profile: base, authenticated: true }));
    expect(screen.getByTestId("block-button")).toBeInTheDocument();
  });

  it("previsualización: pasa preview al FollowButton y oculta el bloqueo", async () => {
    renderWithIntl(await ProfileHeader({ profile: base, authenticated: true, preview: true }));
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-preview", "true");
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
  });

  it("los contadores enlazan a las vistas de conexiones", async () => {
    renderWithIntl(await ProfileHeader({ profile: base, authenticated: true }));
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
    renderWithIntl(await ProfileHeader({ profile: base, authenticated: true }));
    expect(screen.queryByTestId("mutual-followers-row")).not.toBeInTheDocument();
  });

  it("con seguidores en común: renderiza la fila", async () => {
    renderWithIntl(
      await ProfileHeader({
        profile: base,
        authenticated: true,
        mutualFollowers: {
          total: 3,
          first: { id: "u2", username: "leo", displayName: "Leo", profileVisibility: "public", avatarUrl: null },
        },
      }),
    );
    expect(screen.getByTestId("mutual-followers-row")).toHaveTextContent("ana");
  });

  it("la bio se presenta como cita", async () => {
    renderWithIntl(await ProfileHeader({ profile: { ...base, bio: "Me gusta la música ochentera" }, authenticated: false }));
    expect(screen.getByText("Me gusta la música ochentera").closest("blockquote")).not.toBeNull();
  });

  it("muestra la identidad musical, el fondo y los extras que recibe", async () => {
    renderWithIntl(
      await ProfileHeader({
        profile: base,
        authenticated: false,
        identity: <div data-testid="identity" />,
        backdrop: <div data-testid="backdrop" />,
        share: <button type="button">share</button>,
        extras: <p data-testid="extras" />,
      }),
    );
    expect(screen.getByTestId("identity")).toBeInTheDocument();
    expect(screen.getByTestId("backdrop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "share" })).toBeInTheDocument();
    expect(screen.getByTestId("extras")).toBeInTheDocument();
  });

  it("vista del dueño: la capa de edición envuelve solo los datos de la persona", async () => {
    renderWithIntl(
      await ProfileHeader({
        profile: { ...base, relation: "self", isOwner: true },
        authenticated: true,
        identity: <div data-testid="identity" />,
        wrapDetails: (details) => <div data-testid="editable">{details}</div>,
      }),
    );
    const editable = screen.getByTestId("editable");
    expect(editable).toContainElement(screen.getByRole("heading", { name: "Ana Torres" }));
    expect(editable).not.toContainElement(screen.getByTestId("identity"));
  });
});
