import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import SettingsLayout from "./layout";
import SettingsIndexPage from "./page";
import ProfileSettingsPage from "./profile/page";
import CurationSettingsPage from "./curation/page";
import PrivacySettingsPage from "./privacy/page";
import NetworkSettingsPage from "./network/page";
import AccountSettingsPage from "./account/page";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { SettingsNav } from "@/components/settings/SettingsNav";
import { PrivacySettings } from "@/components/social/PrivacySettings";
import { DefaultAudienceSettings } from "@/components/settings/DefaultAudienceSettings";
import { AccountDataCard } from "@/components/settings/account/AccountDataCard";
import { LanguagePreference } from "@/components/settings/account/LanguagePreference";
import { LifecycleCards } from "@/components/settings/account/LifecycleCards";
import { SessionsCard } from "@/components/settings/account/SessionsCard";
import { SignInCard } from "@/components/settings/account/SignInCard";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";
import { OwnerMusicIdentityEditor } from "@/components/profiles/OwnerMusicIdentityEditor";
import { OwnerPromptsEditor } from "@/components/profiles/OwnerPromptsEditor";

const m = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  requirePageSession: vi.fn(),
  listMySessions: vi.fn(),
  getUsernameChangeStatus: vi.fn(),
  getPendingEmailChange: vi.fn(),
  isEmailVerified: vi.fn(),
  countPendingFollowRequests: vi.fn(),
  getOwnProfile: vi.fn(),
  getExtendedIdentity: vi.fn(),
  getShowcase: vi.fn(),
  getCurationSummary: vi.fn(),
  getAccessMethod: vi.fn(),
  redirect: vi.fn(),
  refresh: vi.fn(),
}));

// Traductor de servidor determinista: la clave, más los valores de las variables.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${Object.values(vars).join("/")}` : key,
  ),
  getLocale: vi.fn().mockResolvedValue("es"),
}));
vi.mock("@/i18n/navigation", () => ({
  redirect: m.redirect,
  usePathname: () => "/me/settings/curation",
  useRouter: () => ({ refresh: m.refresh }),
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/services/auth/page-auth", () => ({
  requirePageUser: m.requirePageUser,
  requirePageSession: m.requirePageSession,
}));
vi.mock("@/services/auth/session-list", () => ({ listMySessions: m.listMySessions }));
vi.mock("@/services/auth/username", () => ({ getUsernameChangeStatus: m.getUsernameChangeStatus }));
vi.mock("@/services/auth/email-change", () => ({ getPendingEmailChange: m.getPendingEmailChange }));
vi.mock("@/services/auth/email-verification", () => ({ isEmailVerified: m.isEmailVerified }));
vi.mock("@/services/social/following", () => ({ countPendingFollowRequests: m.countPendingFollowRequests }));
vi.mock("@/services/social/profiles", () => ({ getOwnProfile: m.getOwnProfile }));
vi.mock("@/services/profiles/identity", () => ({ getExtendedIdentity: m.getExtendedIdentity }));
vi.mock("@/services/profiles/showcase", () => ({ getShowcase: m.getShowcase }));
vi.mock("@/services/profiles/curation", () => ({ getCurationSummary: m.getCurationSummary }));
vi.mock("@/services/profiles/account-settings", () => ({ getAccessMethod: m.getAccessMethod }));
// El módulo real abre la conexión a la BD al importarse; solo se usa su tope.
vi.mock("@/services/rating-highlights/rating-highlights", () => ({ RATING_HIGHLIGHT_MAX: 6 }));
// Los editores reales hablan con la API: aquí solo importa que se monten con su `initial`.
vi.mock("@/components/auth/EmailVerificationNotice", () => ({ EmailVerificationNotice: () => null }));
vi.mock("@/components/social/PrivacySettings", () => ({ PrivacySettings: () => null }));
vi.mock("@/components/settings/DefaultAudienceSettings", () => ({ DefaultAudienceSettings: () => null }));
vi.mock("@/components/settings/account/AccountDataCard", () => ({ AccountDataCard: () => null }));
vi.mock("@/components/settings/account/SignInCard", () => ({ SignInCard: () => null }));
vi.mock("@/components/settings/account/SessionsCard", () => ({ SessionsCard: () => null }));
vi.mock("@/components/settings/account/LanguagePreference", () => ({ LanguagePreference: () => null }));
vi.mock("@/components/settings/account/LifecycleCards", () => ({ LifecycleCards: () => null }));
vi.mock("@/components/profiles/OwnerIdentityCardEditor", () => ({ OwnerIdentityCardEditor: () => null }));
vi.mock("@/components/profiles/OwnerIdentityEditor", () => ({ OwnerIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerLinksEditor", () => ({ OwnerLinksEditor: () => null }));
vi.mock("@/components/profiles/OwnerMusicIdentityEditor", () => ({ OwnerMusicIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerPromptsEditor", () => ({ OwnerPromptsEditor: () => null }));
vi.mock("@/components/profiles/OwnerShowcaseEditor", () => ({
  OwnerShowcaseEditor: () => <div>editor de destacados</div>,
}));

type El = { type?: unknown; props?: Record<string, unknown> };

function findElement(node: unknown, type: unknown): El | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as El;
  if (element.type === type) return element;
  return findElement((element.props as { children?: unknown } | undefined)?.children, type);
}

const owner = { id: "u1", username: "ana" };

beforeEach(() => {
  vi.clearAllMocks();
  m.requirePageUser.mockResolvedValue(owner);
  m.isEmailVerified.mockReturnValue(true);
  m.countPendingFollowRequests.mockResolvedValue(0);
});

describe("layout de ajustes", () => {
  it("exige sesión y envuelve las pantallas con el título, el menú y su contenido", async () => {
    const child = <p>pantalla</p>;
    const tree = await SettingsLayout({ children: child });

    expect(m.requirePageUser).toHaveBeenCalled();
    expect(findElement(tree, SettingsNav)).not.toBeNull();
    expect(JSON.stringify(tree)).toContain("settings.title");
    expect(findElement(tree, "p" as never)).toEqual(child);
  });

  it("muestra el aviso de email sin verificar en todas las pantallas cuando falta verificar", async () => {
    m.isEmailVerified.mockReturnValue(false);
    const tree = await SettingsLayout({ children: null });
    expect(findElement(tree, EmailVerificationNotice)?.props?.verified).toBe(false);
  });

  it("pasa verified=true cuando el email está verificado (el aviso se oculta solo)", async () => {
    const tree = await SettingsLayout({ children: null });
    expect(findElement(tree, EmailVerificationNotice)?.props?.verified).toBe(true);
  });

  it("le pasa al menú la bandeja de solicitudes de Red", async () => {
    m.countPendingFollowRequests.mockResolvedValue(4);
    const tree = await SettingsLayout({ children: null });

    expect(m.countPendingFollowRequests).toHaveBeenCalledWith("u1");
    expect(findElement(tree, SettingsNav)?.props?.badges).toEqual({ network: 4 });
  });
});

describe("/me/settings", () => {
  it("redirige a la pantalla Perfil con el locale en curso", async () => {
    await SettingsIndexPage();
    expect(m.redirect).toHaveBeenCalledWith({ href: "/me/settings/profile", locale: "es" });
  });
});

describe("pantalla Perfil", () => {
  it("monta los mismos editores con los valores actuales del dueño", async () => {
    const identityCard = { artist: null, album: null, anthem: null };
    const links = [{ id: "l1", kind: "other", url: "https://ana.example", position: 0 }];
    const prompts = [{ promptKey: "first-record", answer: "Un casete", position: 0 }];
    m.getExtendedIdentity.mockResolvedValue({
      username: "ana",
      displayName: "Ana Pérez",
      bio: "hola",
      pronouns: null,
      pronounSet: "she",
      country: "CL",
      location: "Quilpué",
      timezone: "America/Santiago",
      showLocalTime: true,
      selfRoles: ["collector"],
      genres: ["jazz", "shoegaze"],
      listeningFormats: ["vinyl"],
      prompts,
      links,
    });
    m.getShowcase.mockResolvedValue({ pinned: [], identityCard });

    const tree = await ProfileSettingsPage();

    expect(m.getExtendedIdentity).toHaveBeenCalledWith("u1");
    expect(findElement(tree, OwnerIdentityCardEditor)?.props?.initial).toBe(identityCard);
    expect(findElement(tree, OwnerIdentityEditor)?.props?.initial).toEqual({
      bio: "hola",
      pronouns: null,
      pronounSet: "she",
      country: "CL",
      location: "Quilpué",
      timezone: "America/Santiago",
      showLocalTime: true,
    });
    // El ejemplo de los pronombres usa el nombre visible de la persona.
    expect(findElement(tree, OwnerIdentityEditor)?.props?.name).toBe("Ana Pérez");
    expect(findElement(tree, OwnerMusicIdentityEditor)?.props?.initial).toEqual({
      selfRoles: ["collector"],
      genres: ["jazz", "shoegaze"],
      listeningFormats: ["vinyl"],
    });
    expect(findElement(tree, OwnerPromptsEditor)?.props?.initial).toBe(prompts);
    expect(findElement(tree, OwnerLinksEditor)?.props?.initialLinks).toBe(links);
  });

  it("si el perfil ya no existe no renderiza nada", async () => {
    m.getExtendedIdentity.mockResolvedValue(null);
    m.getShowcase.mockResolvedValue({ pinned: [], identityCard: {} });
    expect(await ProfileSettingsPage()).toBeNull();
  });
});

describe("pantalla Privacidad y audiencia", () => {
  it("monta el selector de visibilidad con el valor actual", async () => {
    m.getOwnProfile.mockResolvedValue({ profileVisibility: "private", defaultAudience: null });

    const tree = await PrivacySettingsPage();

    expect(m.getOwnProfile).toHaveBeenCalledWith("u1");
    expect(findElement(tree, PrivacySettings)?.props?.initialVisibility).toBe("private");
  });

  it("monta el control de audiencia por defecto con la preferencia guardada", async () => {
    m.getOwnProfile.mockResolvedValue({ profileVisibility: "public", defaultAudience: "followers" });
    const tree = await PrivacySettingsPage();
    expect(findElement(tree, DefaultAudienceSettings)?.props?.initialAudience).toBe("followers");
  });

  it("sin preferencia el control recibe null ('según el tipo')", async () => {
    m.getOwnProfile.mockResolvedValue({ profileVisibility: "public", defaultAudience: null });
    const tree = await PrivacySettingsPage();
    expect(findElement(tree, DefaultAudienceSettings)?.props?.initialAudience).toBeNull();
  });
});

describe("pantalla Cuenta y seguridad", () => {
  const now = new Date("2026-09-21T10:00:00Z");
  const renderAccount = () => AccountSettingsPage({ searchParams: Promise.resolve({}) });

  beforeEach(() => {
    m.requirePageSession.mockResolvedValue({
      sessionId: "s1",
      sessionCreatedAt: now,
      user: { id: "u1", email: "ana@example.com", username: "ana" },
    });
    m.getOwnProfile.mockResolvedValue({ username: "ana", displayName: "Ana" });
    m.getAccessMethod.mockResolvedValue({ hasPassword: true, providers: [] });
    m.getUsernameChangeStatus.mockResolvedValue({ username: "ana", nextChangeAt: null });
    m.getPendingEmailChange.mockResolvedValue(null);
    m.listMySessions.mockResolvedValue([]);
  });

  it("exige la sesión completa (necesita saber cuál es 'esta sesión')", async () => {
    await renderAccount();
    expect(m.requirePageSession).toHaveBeenCalled();
    expect(m.listMySessions).toHaveBeenCalledWith("u1", "s1");
  });

  it("monta los datos de la cuenta con nombre, usuario y email", async () => {
    m.isEmailVerified.mockReturnValue(true);
    const tree = await renderAccount();

    expect(m.getOwnProfile).toHaveBeenCalledWith("u1");
    expect(findElement(tree, AccountDataCard)?.props).toMatchObject({
      username: "ana",
      displayName: "Ana",
      email: "ana@example.com",
      emailVerified: true,
      pendingEmail: null,
      usernameNextChangeAt: null,
      hasPassword: true,
    });
  });

  it("pasa la fecha en que se puede volver a cambiar el usuario y el cambio de email pendiente", async () => {
    const next = new Date("2026-10-21T12:00:00Z");
    m.getUsernameChangeStatus.mockResolvedValue({ username: "ana", nextChangeAt: next });
    m.getPendingEmailChange.mockResolvedValue({ newEmail: "nuevo@ejemplo.com", expiresAt: new Date() });

    const props = findElement(await renderAccount(), AccountDataCard)?.props;

    expect(props).toMatchObject({ usernameNextChangeAt: next.toISOString(), pendingEmail: "nuevo@ejemplo.com" });
  });

  it("una cuenta con contraseña y sin Google", async () => {
    const props = findElement(await renderAccount(), SignInCard)?.props;
    expect(props).toMatchObject({ hasPassword: true, googleLinked: false, flash: null });
  });

  it("una cuenta de Google sin contraseña se lo comunica a la tarjeta de acceso", async () => {
    m.getAccessMethod.mockResolvedValue({ hasPassword: false, providers: ["google"] });
    const tree = await renderAccount();
    expect(findElement(tree, SignInCard)?.props).toMatchObject({ hasPassword: false, googleLinked: true });
    expect(findElement(tree, AccountDataCard)?.props?.hasPassword).toBe(false);
  });

  it("nunca pasa el hash de la contraseña ni el token de las sesiones a los componentes", async () => {
    m.listMySessions.mockResolvedValue([
      { id: "s1", deviceLabel: "Chrome · Windows", createdAt: now, lastSeenAt: null, current: true },
    ]);
    const serialized = JSON.stringify(await renderAccount());
    expect(serialized).not.toMatch(/passwordHash|tokenHash/);
  });

  it("pasa las sesiones serializadas, con la actual marcada", async () => {
    m.listMySessions.mockResolvedValue([
      { id: "s1", deviceLabel: "Chrome · Windows", createdAt: now, lastSeenAt: now, current: true },
      { id: "s2", deviceLabel: null, createdAt: now, lastSeenAt: null, current: false },
    ]);

    const props = findElement(await renderAccount(), SessionsCard)?.props;

    expect(props?.sessions).toEqual([
      { id: "s1", deviceLabel: "Chrome · Windows", createdAt: now.toISOString(), lastSeenAt: now.toISOString(), current: true },
      { id: "s2", deviceLabel: null, createdAt: now.toISOString(), lastSeenAt: null, current: false },
    ]);
  });

  it("ofrece desactivar, exportar y eliminar con el usuario y el método de acceso de la cuenta", async () => {
    const props = findElement(await renderAccount(), LifecycleCards)?.props;
    expect(props).toMatchObject({ username: "ana", hasPassword: true });

    m.getAccessMethod.mockResolvedValue({ hasPassword: false, providers: ["google"] });
    expect(findElement(await renderAccount(), LifecycleCards)?.props?.hasPassword).toBe(false);
  });

  it("ofrece el idioma de la interfaz", async () => {
    expect(findElement(await renderAccount(), LanguagePreference)).not.toBeNull();
  });

  describe("resultado del flujo de Google (query ?google=)", () => {
    const flash = async (query: { google?: string; code?: string }) =>
      findElement(await AccountSettingsPage({ searchParams: Promise.resolve(query) }), SignInCard)?.props?.flash;

    it("google=linked y google=confirmed", async () => {
      m.getAccessMethod.mockResolvedValue({ hasPassword: true, providers: ["google"] });
      expect(await flash({ google: "linked" })).toEqual({ kind: "linked" });
      expect(await flash({ google: "confirmed" })).toEqual({ kind: "confirmed" });
    });

    it("google=linked de una URL vieja NO se afirma si Google ya no está vinculada", async () => {
      m.getAccessMethod.mockResolvedValue({ hasPassword: true, providers: [] });
      expect(await flash({ google: "linked" })).toBeNull();
    });

    it("google=error con un código conocido", async () => {
      expect(await flash({ google: "error", code: "OAUTH_IDENTITY_TAKEN" })).toEqual({
        kind: "error",
        code: "OAUTH_IDENTITY_TAKEN",
      });
    });

    it("un código desconocido o manipulado se reemplaza por un error genérico", async () => {
      expect(await flash({ google: "error", code: "<script>" })).toEqual({ kind: "error", code: "INTERNAL_ERROR" });
      expect(await flash({ google: "error" })).toEqual({ kind: "error", code: "INTERNAL_ERROR" });
    });

    it("un valor desconocido no muestra nada", async () => {
      expect(await flash({ google: "hack" })).toBeNull();
    });
  });
});

describe("pantalla Red", () => {
  it("enlaza las superficies existentes de red y bloqueos, sin biblioteca ni ajustes", async () => {
    renderWithIntl(await NetworkSettingsPage());

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/users/ana/connections/followers",
      "/users/ana/connections/following",
      "/me/follow-requests",
      "/me/blocks",
    ]);
  });

  it("muestra la bandeja de solicitudes solo cuando hay pendientes", async () => {
    m.countPendingFollowRequests.mockResolvedValue(3);
    renderWithIntl(await NetworkSettingsPage());
    expect(screen.getByText("pendingFollowRequests:3")).toBeInTheDocument();
  });

  it("sin pendientes no hay ningún indicador numérico", async () => {
    renderWithIntl(await NetworkSettingsPage());
    expect(screen.queryByText(/pendingFollowRequests/)).not.toBeInTheDocument();
  });
});

describe("pantalla Curaduría", () => {
  const showcase = {
    pinned: [{ id: "p1" }, { id: "p2" }, { id: "p3" }],
    identityCard: { artist: null, album: null, anthem: null },
  };

  beforeEach(() => {
    m.getShowcase.mockResolvedValue(showcase);
    m.getCurationSummary.mockResolvedValue({ pinnedLists: 2, ratingHighlights: 4, diaryHighlights: 1 });
  });

  it("carga los destacados y los conteos de curaduría del dueño", async () => {
    await CurationSettingsPage();

    expect(m.getShowcase).toHaveBeenCalledWith("u1");
    expect(m.getCurationSummary).toHaveBeenCalledWith("u1");
  });

  it("muestra cada tipo de curaduría con su conteo real", async () => {
    renderWithIntl(await CurationSettingsPage());

    expect(screen.getByText("settings.curation.outOf:3/4")).toBeInTheDocument(); // empieza por aquí
    expect(screen.getByText("settings.curation.outOf:4/6")).toBeInTheDocument(); // valoraciones
    expect(screen.getByText("2")).toBeInTheDocument(); // listas fijadas
    expect(screen.getByText("1")).toBeInTheDocument(); // diario destacado
  });

  it("listas fijadas y diario destacado enlazan a su origen; las valoraciones no llevan acción", async () => {
    renderWithIntl(await CurationSettingsPage());

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/me/lists", "/me/diary"]);
  });

  it("Empieza por aquí abre su editor en el panel lateral, sin salir de la pantalla", async () => {
    const user = userEvent.setup();
    renderWithIntl(await CurationSettingsPage());

    await user.click(screen.getByRole("button", { name: "Editar settings.curation.pinned.title" }));

    const dialog = await screen.findByRole("dialog", { name: "settings.curation.pinned.title" });
    expect(dialog).toHaveTextContent("editor de destacados");
  });

  it("no lista el himno ni los álbumes favoritos (el himno se elige desde la Tarjeta de Identidad)", async () => {
    renderWithIntl(await CurationSettingsPage());

    expect(screen.queryByText("settings.curation.anthem.title")).not.toBeInTheDocument();
    expect(screen.queryByText("settings.curation.albumFavorites.title")).not.toBeInTheDocument();
    // Solo "Empieza por aquí" es editable desde aquí.
    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(1);
  });

  it("cerrar el panel devuelve el foco a su botón", async () => {
    const user = userEvent.setup();
    renderWithIntl(await CurationSettingsPage());
    const button = screen.getByRole("button", { name: "Editar settings.curation.pinned.title" });
    await user.click(button);
    await screen.findByRole("dialog", { name: "settings.curation.pinned.title" });

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(button).toHaveFocus();
  });
});
