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
import { DisplayNameForm } from "@/components/settings/DisplayNameForm";
import { RevokeSessionsButton } from "@/components/settings/RevokeSessionsButton";
import { OwnerIdentityCardEditor } from "@/components/profiles/OwnerIdentityCardEditor";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import { OwnerLinksEditor } from "@/components/profiles/OwnerLinksEditor";

const m = vi.hoisted(() => ({
  requirePageUser: vi.fn(),
  isEmailVerified: vi.fn(),
  countPendingFollowRequests: vi.fn(),
  getOwnProfile: vi.fn(),
  getExtendedIdentity: vi.fn(),
  getShowcase: vi.fn(),
  getAlbumFavorites: vi.fn(),
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
vi.mock("@/services/auth/page-auth", () => ({ requirePageUser: m.requirePageUser }));
vi.mock("@/services/auth/email-verification", () => ({ isEmailVerified: m.isEmailVerified }));
vi.mock("@/services/social/following", () => ({ countPendingFollowRequests: m.countPendingFollowRequests }));
vi.mock("@/services/social/profiles", () => ({ getOwnProfile: m.getOwnProfile }));
vi.mock("@/services/profiles/identity", () => ({ getExtendedIdentity: m.getExtendedIdentity }));
vi.mock("@/services/profiles/showcase", () => ({ getShowcase: m.getShowcase }));
vi.mock("@/services/profiles/album-favorites", () => ({ getAlbumFavorites: m.getAlbumFavorites }));
vi.mock("@/services/profiles/curation", () => ({ getCurationSummary: m.getCurationSummary }));
vi.mock("@/services/profiles/account-settings", () => ({ getAccessMethod: m.getAccessMethod }));
// El módulo real abre la conexión a la BD al importarse; solo se usa su tope.
vi.mock("@/services/rating-highlights/rating-highlights", () => ({ RATING_HIGHLIGHT_MAX: 6 }));
// Los editores reales hablan con la API: aquí solo importa que se monten con su `initial`.
vi.mock("@/components/auth/EmailVerificationNotice", () => ({ EmailVerificationNotice: () => null }));
vi.mock("@/components/social/PrivacySettings", () => ({ PrivacySettings: () => null }));
vi.mock("@/components/settings/DefaultAudienceSettings", () => ({ DefaultAudienceSettings: () => null }));
vi.mock("@/components/settings/DisplayNameForm", () => ({ DisplayNameForm: () => null }));
vi.mock("@/components/settings/RevokeSessionsButton", () => ({ RevokeSessionsButton: () => null }));
vi.mock("@/components/profiles/OwnerIdentityCardEditor", () => ({ OwnerIdentityCardEditor: () => null }));
vi.mock("@/components/profiles/OwnerIdentityEditor", () => ({ OwnerIdentityEditor: () => null }));
vi.mock("@/components/profiles/OwnerLinksEditor", () => ({ OwnerLinksEditor: () => null }));
vi.mock("@/components/profiles/OwnerShowcaseEditor", () => ({
  OwnerShowcaseEditor: () => <div>editor de destacados</div>,
}));
vi.mock("@/components/profiles/OwnerAlbumFavoritesEditor", () => ({
  OwnerAlbumFavoritesEditor: () => <div>editor de álbumes</div>,
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
    const links = [{ id: "l1", kind: "website", url: "https://ana.example", position: 0 }];
    m.getExtendedIdentity.mockResolvedValue({
      bio: "hola",
      pronouns: "ella",
      location: "Quilpué",
      timezone: "America/Santiago",
      links,
    });
    m.getShowcase.mockResolvedValue({ pinned: [], anthem: null, identityCard });

    const tree = await ProfileSettingsPage();

    expect(m.getExtendedIdentity).toHaveBeenCalledWith("u1");
    expect(findElement(tree, OwnerIdentityCardEditor)?.props?.initial).toBe(identityCard);
    expect(findElement(tree, OwnerIdentityEditor)?.props?.initial).toEqual({
      bio: "hola",
      pronouns: "ella",
      location: "Quilpué",
      timezone: "America/Santiago",
    });
    expect(findElement(tree, OwnerLinksEditor)?.props?.initialLinks).toBe(links);
  });

  it("si el perfil ya no existe no renderiza nada", async () => {
    m.getExtendedIdentity.mockResolvedValue(null);
    m.getShowcase.mockResolvedValue({ pinned: [], anthem: null, identityCard: {} });
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
  beforeEach(() => {
    m.getOwnProfile.mockResolvedValue({ username: "ana", displayName: "Ana" });
    m.getAccessMethod.mockResolvedValue({ hasPassword: true, providers: [] });
  });

  it("monta el formulario del nombre visible con el nombre y el usuario actuales", async () => {
    const tree = await AccountSettingsPage();

    expect(m.getOwnProfile).toHaveBeenCalledWith("u1");
    expect(findElement(tree, DisplayNameForm)?.props).toMatchObject({
      initialDisplayName: "Ana",
      username: "ana",
    });
  });

  it("ofrece cerrar todas las sesiones", async () => {
    expect(findElement(await AccountSettingsPage(), RevokeSessionsButton)).not.toBeNull();
  });

  it("una cuenta con contraseña muestra 'correo y contraseña' como método", async () => {
    renderWithIntl(await AccountSettingsPage());
    expect(screen.getByText("settings.account.access.password")).toBeInTheDocument();
  });

  it("una cuenta de Google sin contraseña no muestra la opción de contraseña", async () => {
    m.getAccessMethod.mockResolvedValue({ hasPassword: false, providers: ["google"] });
    renderWithIntl(await AccountSettingsPage());

    expect(screen.queryByText("settings.account.access.password")).not.toBeInTheDocument();
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("sin ningún método vinculado lo dice en vez de dejar la lista vacía", async () => {
    m.getAccessMethod.mockResolvedValue({ hasPassword: false, providers: [] });
    renderWithIntl(await AccountSettingsPage());
    expect(screen.getByText("settings.account.access.none")).toBeInTheDocument();
  });

  it("no ofrece controles de funciones que no existen (email, contraseña, eliminar cuenta)", async () => {
    renderWithIntl(await AccountSettingsPage());
    expect(screen.queryByText(/eliminar|delete|email|correo/i)).not.toBeInTheDocument();
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
    anthem: { title: "Mountains" },
    identityCard: { artist: null, album: null, anthem: null },
  };

  beforeEach(() => {
    m.getShowcase.mockResolvedValue(showcase);
    m.getAlbumFavorites.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    m.getCurationSummary.mockResolvedValue({ pinnedLists: 2, ratingHighlights: 4, diaryHighlights: 1 });
  });

  it("carga los álbumes favoritos con las tres audiencias y los conteos de curaduría", async () => {
    await CurationSettingsPage();

    expect(m.getAlbumFavorites).toHaveBeenCalledWith("u1", ["private", "followers", "public"]);
    expect(m.getCurationSummary).toHaveBeenCalledWith("u1");
  });

  it("muestra cada tipo de curaduría con su conteo real", async () => {
    renderWithIntl(await CurationSettingsPage());

    expect(screen.getByText("settings.curation.outOf:3/4")).toBeInTheDocument(); // destacados
    expect(screen.getByText("Mountains")).toBeInTheDocument(); // himno
    expect(screen.getByText("settings.curation.outOf:2/6")).toBeInTheDocument(); // álbumes
    expect(screen.getByText("settings.curation.outOf:4/6")).toBeInTheDocument(); // valoraciones
    expect(screen.getByText("2")).toBeInTheDocument(); // listas fijadas
    expect(screen.getByText("1")).toBeInTheDocument(); // diario destacado
  });

  it("listas fijadas y diario destacado enlazan a su origen; las valoraciones no llevan acción", async () => {
    renderWithIntl(await CurationSettingsPage());

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/me/lists", "/me/diary"]);
  });

  it("Destacados abre su editor en el panel lateral, sin salir de la pantalla", async () => {
    const user = userEvent.setup();
    renderWithIntl(await CurationSettingsPage());

    await user.click(screen.getByRole("button", { name: "Editar settings.curation.pinned.title" }));

    const dialog = await screen.findByRole("dialog", { name: "settings.curation.pinned.title" });
    expect(dialog).toHaveTextContent("editor de destacados");
  });

  it("Álbumes favoritos abre su propio editor", async () => {
    const user = userEvent.setup();
    renderWithIntl(await CurationSettingsPage());

    await user.click(screen.getByRole("button", { name: "Editar settings.curation.albumFavorites.title" }));

    expect(await screen.findByText("editor de álbumes")).toBeInTheDocument();
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
