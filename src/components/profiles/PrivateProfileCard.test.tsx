import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { PrivateProfileCard, privateState } from "./PrivateProfileCard";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars?.username ? `${key}(@${vars.username})` : key,
  ),
  getFormatter: vi.fn().mockResolvedValue({ dateTime: () => "septiembre de 2025" }),
}));

vi.mock("@/components/social/FollowButton", () => ({
  FollowButton: (props: {
    relation: string;
    authenticated: boolean;
    preview?: boolean;
    requestApproval?: boolean;
    refreshOnAnyChange?: boolean;
  }) => (
    <div
      data-testid="follow-button"
      data-relation={props.relation}
      data-authenticated={String(props.authenticated)}
      data-preview={props.preview ? "true" : undefined}
      data-request-approval={props.requestApproval ? "true" : undefined}
      data-refresh-any={props.refreshOnAnyChange ? "true" : undefined}
    />
  ),
}));

vi.mock("@/components/social/BlockButton", () => ({
  BlockButton: (props: { blocked: boolean; variant?: string; refreshOnChange?: boolean }) => (
    <div
      data-testid="block-button"
      data-blocked={String(props.blocked)}
      data-variant={props.variant}
      data-refresh={props.refreshOnChange ? "true" : undefined}
    />
  ),
}));

vi.mock("@/components/profiles/ProfileModerationActions", () => ({
  ProfileModerationActions: () => <div data-testid="moderation-actions" />,
}));

const base: ProfileView = {
  id: "u1",
  username: "ana",
  displayName: "Ana Torres",
  profileVisibility: "private",
  bio: "Colecciono ediciones japonesas.",
  pronouns: "elle",
  location: "Rosario",
  timezone: null,
  avatarUrl: null,
  memberSince: new Date("2025-09-15T00:00:00Z"),
  links: [{ id: "l1", kind: "bandcamp", url: "https://ana.bandcamp.com", position: 0 }],
  followerCount: 12,
  followingCount: 8,
  relation: "none",
  accessible: false,
  blockedByMe: false,
  isOwner: false,
};

async function renderCard(
  over: Partial<ProfileView> = {},
  props: { authenticated?: boolean; mutualFollowers?: number; preview?: boolean } = {},
) {
  renderWithIntl(
    await PrivateProfileCard({
      profile: { ...base, ...over },
      authenticated: props.authenticated ?? true,
      mutualFollowers: props.mutualFollowers ?? 0,
      preview: props.preview,
    }),
  );
}

describe("privateState", () => {
  it("resuelve el estado exacto de quien no tiene acceso", () => {
    const none = { relation: "none", blockedByMe: false } as const;
    expect(privateState(none, false, false)).toBe("anonymous");
    expect(privateState(none, true, false)).toBe("none");
    expect(privateState({ relation: "requested", blockedByMe: false }, true, false)).toBe("requested");
    expect(privateState({ relation: "incoming", blockedByMe: false }, true, false)).toBe("incoming");
    expect(privateState({ relation: "blocked", blockedByMe: true }, true, false)).toBe("blockedByMe");
    expect(privateState({ relation: "blocked", blockedByMe: false }, true, false)).toBe("blockedByThem");
    // "cómo te ven" gana sobre todo lo demás: el dueño ve lo que ve un anónimo.
    expect(privateState(none, true, true)).toBe("preview");
  });
});

describe("PrivateProfileCard", () => {
  it("identidad extendida en la misma tarjeta: nombre, chip privado, contadores, bio y enlaces", async () => {
    await renderCard();
    expect(screen.getByRole("heading", { level: 1, name: "Ana Torres" })).toBeInTheDocument();
    expect(screen.getByText("privateProfile.chipPrivate")).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.getByText("elle")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Colecciono ediciones japonesas.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "linkAria" })).toHaveAttribute(
      "href",
      "https://ana.bandcamp.com",
    );
    expect(screen.getByRole("heading", { level: 2, name: "privateNoticeTitle" })).toBeInTheDocument();
  });

  it("los contadores NO son enlaces (los listados de conexiones de un perfil privado son un callejón sin salida)", async () => {
    await renderCard();
    expect(screen.getByText("12").closest("a")).toBeNull();
    expect(screen.getByText("8").closest("a")).toBeNull();
  });

  it("sin relación: una sola acción 'solicitar seguir' con refresco, y los 4 estantes bloqueados sin cifras", async () => {
    await renderCard({ relation: "none" });
    const follow = screen.getAllByTestId("follow-button");
    expect(follow).toHaveLength(1);
    expect(follow[0]).toHaveAttribute("data-relation", "none");
    expect(follow[0]).toHaveAttribute("data-request-approval", "true");
    expect(follow[0]).toHaveAttribute("data-refresh-any", "true");
    expect(screen.getByText("privateProfile.body.none(@ana)")).toBeInTheDocument();

    const shelves = screen.getByText("privateProfile.opensOnFollow").parentElement!;
    const items = within(shelves).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["diaryTitle", "favoritesTitle", "listsTitle", "collectionTitle"]);
  });

  it("anónimo: acción de iniciar sesión + 'Crear cuenta', sin bloqueo", async () => {
    await renderCard({}, { authenticated: false });
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-authenticated", "false");
    expect(screen.getByRole("link", { name: "createAccount" })).toHaveAttribute("href", "/auth/register");
    expect(screen.getByText("privateProfile.body.anonymous(@ana)")).toBeInTheDocument();
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("moderation-actions")).not.toBeInTheDocument();
  });

  it("solicitud enviada: mensaje propio y la acción de cancelar", async () => {
    await renderCard({ relation: "requested" });
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-relation", "requested");
    expect(screen.getByText("privateProfile.body.requested(@ana)")).toBeInTheDocument();
    expect(screen.getByText("privateProfile.opensOnFollow")).toBeInTheDocument();
  });

  it("te envió una solicitud: mensaje propio, Aprobar/Rechazar y sin vitrina de estantes", async () => {
    await renderCard({ relation: "incoming" }, { mutualFollowers: 2 });
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-relation", "incoming");
    expect(screen.getByText("privateProfile.body.incoming(@ana)")).toBeInTheDocument();
    expect(screen.queryByText("privateProfile.opensOnFollow")).not.toBeInTheDocument();
  });

  it("seguidores en común: solo el número, y solo si hay", async () => {
    await renderCard({ relation: "none" }, { mutualFollowers: 3 });
    expect(screen.getByText("privateNoticeMutual")).toBeInTheDocument();
  });

  it("sin seguidores en común: no muestra la línea", async () => {
    await renderCard({ relation: "none" }, { mutualFollowers: 0 });
    expect(screen.queryByText("privateNoticeMutual")).not.toBeInTheDocument();
  });

  it("bloqueaste a esta cuenta: 'Desbloquear' como acción principal, sin FollowButton ni segundo bloqueo", async () => {
    await renderCard({ relation: "blocked", blockedByMe: true });
    expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
    const blocks = screen.getAllByTestId("block-button");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toHaveAttribute("data-blocked", "true");
    expect(blocks[0]).toHaveAttribute("data-variant", "secondary");
    expect(blocks[0]).toHaveAttribute("data-refresh", "true");
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.titleBlockedByMe" })).toBeInTheDocument();
    expect(screen.getByText("privateProfile.chipBlocked")).toBeInTheDocument();
    // ya no dice "Seguí a @x…": no se ofrecen los estantes de quien no puede seguir
    expect(screen.queryByText("privateProfile.opensOnFollow")).not.toBeInTheDocument();
    expect(screen.getByTestId("moderation-actions")).toBeInTheDocument();
  });

  it("te bloqueó: solo nombre y usuario — sin bio, enlaces, contadores ni pronombres — y sin acciones", async () => {
    await renderCard({ relation: "blocked", blockedByMe: false });
    expect(screen.getByRole("heading", { level: 1, name: "Ana Torres" })).toBeInTheDocument();
    expect(screen.getByText("@ana")).toBeInTheDocument();
    expect(screen.queryByText("Colecciono ediciones japonesas.")).not.toBeInTheDocument();
    expect(screen.queryByText("elle")).not.toBeInTheDocument();
    expect(screen.queryByText("Rosario")).not.toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "linkAria" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("follow-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("moderation-actions")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "privateProfile.titleBlockedByThem" })).toBeInTheDocument();
  });

  it("'cómo te ven': acción inerte y sin bloqueo ni moderación", async () => {
    await renderCard({ relation: "none" }, { authenticated: true, preview: true });
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-preview", "true");
    expect(screen.getByTestId("follow-button")).toHaveAttribute("data-request-approval", "true");
    expect(screen.queryByTestId("block-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("moderation-actions")).not.toBeInTheDocument();
    expect(screen.getByText("privateProfile.opensOnFollow")).toBeInTheDocument();
  });

  it("visitante autenticado: conserva bloquear (refrescando la página) y moderación", async () => {
    await renderCard({ relation: "none" });
    const block = screen.getByTestId("block-button");
    expect(block).toHaveAttribute("data-blocked", "false");
    expect(block).toHaveAttribute("data-refresh", "true");
    expect(screen.getByTestId("moderation-actions")).toBeInTheDocument();
  });
});
