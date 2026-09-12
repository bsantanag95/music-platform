import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { Header } from "./Header";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
  apiFetch: vi.fn(),
  searchCatalog: vi.fn(),
  pathname: "/album/rg-1",
  search: "",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(mocks.search),
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh, push: mocks.push }),
}));

vi.mock("@/lib/api/client", () => ({
  apiFetch: mocks.apiFetch,
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/lib/api/catalog", () => ({
  searchCatalog: mocks.searchCatalog,
}));

vi.mock("next-intl", async () => {
  const actual = await vi.importActual("next-intl");
  return {
    ...actual,
    useLocale: () => "es",
    useTranslations: () => (key: string, values?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        home: "Inicio",
        search: "Buscar",
        "search.fieldLabel": "Buscar artista",
        "search.placeholder": "Ej: Pink Floyd",
        login: "Iniciar sesión",
        register: "Registrarse",
        logout: "Cerrar sesión",
        logoutPending: "Cerrando sesión...",
        signedInAs: "Sesión iniciada como",
        localeSwitcher: "Idioma",
        diary: "Diario",
        feed: "Feed",
        favorites: "Favoritos",
        lists: "Listas",
        activity: "Actividad",
        collection: "Colección",
        profile: "Mi perfil",
        artists: "Artistas seguidos",
        followers: "Seguidores",
        following: "Seguidos",
        followRequests: "Solicitudes",
        blocks: "Cuentas bloqueadas",
        settings: "Ajustes",
        userMenu: "Menú de usuario",
        generalNav: "Navegación general",
        moderation: "Moderación",
        administration: "Administración",
        openMenu: "Abrir menú",
        closeMenu: "Cerrar menú",
        "global.trigger": "Registrar",
      };
      if (map[key]) return map[key];
      if (values && "count" in values) return `${key}:${values.count}`;
      return key;
    },
  };
});

vi.mock("@/lib/api/schemas", () => ({ LogoutResponseSchema: {} }));

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["es", "en"], defaultLocale: "es" },
}));

describe("Header", () => {
  it("muestra un campo de búsqueda persistente", () => {
    renderWithIntl(<Header />);

    expect(screen.getByLabelText("Buscar artista")).toBeInTheDocument();
  });

  it("muestra un logo que enlaza al inicio", () => {
    renderWithIntl(<Header />);

    expect(screen.getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
  });

  it("no muestra el buscador de usuarios como navegación principal", () => {
    renderWithIntl(<Header />);

    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("muestra login y registro como acciones primarias para visitantes", () => {
    renderWithIntl(<Header />);

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    expect(screen.getByRole("link", { name: "Registrarse" })).toHaveAttribute(
      "href",
      "/auth/register",
    );
  });

  it("permite cerrar sesión y refresca el estado de la ruta", async () => {
    mocks.apiFetch.mockResolvedValueOnce({ ok: true });
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ana" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(mocks.apiFetch).toHaveBeenCalledWith("/api/auth/logout", expect.anything(), {
      method: "DELETE",
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("muestra el error localizado sin exponer el mensaje del backend", async () => {
    mocks.apiFetch.mockRejectedValueOnce({ code: "INTERNAL_ERROR" });
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ana" }));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("INTERNAL_ERROR.description");
  });

  it("muestra botones para cada locale", () => {
    renderWithIntl(<Header />);

    expect(screen.getByRole("button", { name: "es" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "en" })).toBeInTheDocument();
  });

  it("marca el locale activo con aria-current", () => {
    renderWithIntl(<Header />);

    expect(screen.getByRole("button", { name: "es" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.queryByRole("button", { name: "en" })).not.toHaveAttribute("aria-current");
  });

  it("cambia de locale preservando la ruta actual", () => {
    renderWithIntl(<Header />);

    fireEvent.click(screen.getByRole("button", { name: "en" }));

    expect(mocks.replace).toHaveBeenCalledWith("/album/rg-1", { locale: "en" });
  });

  it("cambia de locale preservando el query string (ej. ?q= en /search)", () => {
    mocks.pathname = "/search";
    mocks.search = "q=Sabrina";

    renderWithIntl(<Header />);
    fireEvent.click(screen.getByRole("button", { name: "en" }));

    expect(mocks.replace).toHaveBeenCalledWith("/search?q=Sabrina", { locale: "en" });
  });

  it("el botón de menú mobile pliega la barra general y la zona de usuario", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    // Con el panel cerrado, las superficies personales no están en el DOM: el
    // menú de escritorio está plegado y el panel mobile no se ha abierto.
    expect(screen.queryByRole("link", { name: "Diario" })).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("link", { name: "Diario" })).toBeInTheDocument();
  });

  it("la barra general de escritorio no muestra enlaces a superficies personales", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    for (const label of ["Diario", "Feed", "Favoritos", "Colección"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("la barra general muestra 'Listas' hacia la superficie pública /lists", () => {
    renderWithIntl(<Header />);

    const listsLink = screen.getByRole("link", { name: "Listas" });
    expect(listsLink).toHaveAttribute("href", "/lists");
  });

  it("la barra general muestra 'Actividad' hacia la superficie pública /activity, con y sin sesión", () => {
    renderWithIntl(<Header />);
    expect(screen.getByRole("link", { name: "Actividad" })).toHaveAttribute("href", "/activity");

    renderWithIntl(<Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />);
    expect(screen.getAllByRole("link", { name: "Actividad" })[0]).toHaveAttribute("href", "/activity");
  });

  it("el control 'Registrar' no aparece sin sesión", () => {
    renderWithIntl(<Header />);
    expect(screen.queryByRole("button", { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it("el control 'Registrar' aparece con sesión en la barra general", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );
    // Uno en la barra de escritorio; el panel móvil está cerrado.
    expect(screen.getByRole("button", { name: /Registrar/ })).toBeInTheDocument();
  });

  it("abre el modal de registro sin QueryClientProvider (el Header vive fuera de Providers)", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Registrar/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("despliega el menú de usuario al posar el cursor, sin clic", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    const trigger = screen.getByRole("button", { name: "Ana" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Diario" })).not.toBeInTheDocument();

    fireEvent.mouseEnter(trigger.parentElement as HTMLElement);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Diario" })).toBeInTheDocument();

    fireEvent.mouseLeave(trigger.parentElement as HTMLElement);
    expect(screen.queryByRole("link", { name: "Diario" })).not.toBeInTheDocument();
  });

  it("el menú de usuario agrupa las superficies personales, con Feed dentro", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ana" }));

    expect(screen.getByRole("link", { name: "Mi perfil" })).toHaveAttribute(
      "href",
      "/users/ana",
    );
    expect(screen.getByRole("link", { name: "Feed" })).toHaveAttribute("href", "/me/feed");
    expect(screen.getByRole("link", { name: "Diario" })).toHaveAttribute("href", "/me/diary");
  });

  it("cierra el menú de usuario con Escape y devuelve el foco al disparador", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    const trigger = screen.getByRole("button", { name: "Ana" });
    fireEvent.click(trigger);
    expect(screen.getByRole("link", { name: "Diario" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("link", { name: "Diario" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("muestra el número de solicitudes de seguimiento pendientes en el menú", () => {
    renderWithIntl(
      <Header
        user={{ id: "u1", username: "ana", displayName: "Ana" }}
        pendingFollowRequests={3}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ana" }));

    const requests = screen.getByRole("link", { name: /Solicitudes/ });
    expect(requests).toHaveAttribute("href", "/me/follow-requests");
    expect(requests).toHaveTextContent("3");
  });

  it("un usuario normal no ve enlaces a moderación ni administración", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    expect(screen.queryByRole("link", { name: "Moderación" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();
  });

  it("un moderador ve el enlace a moderación pero no a administración", () => {
    renderWithIntl(
      <Header
        user={{ id: "u1", username: "ana", displayName: "Ana" }}
        platformPermissions={["moderation.review_content"]}
      />,
    );

    const moderation = screen.getByRole("link", { name: "Moderación" });
    expect(moderation).toHaveAttribute("href", "/moderation");
    expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();
  });

  it("un administrador ve administración y moderación en la barra general", () => {
    renderWithIntl(
      <Header
        user={{ id: "u1", username: "ana", displayName: "Ana" }}
        platformPermissions={["moderation.review_content", "moderation.suspend_social", "editorial.author", "editorial.publish", "platform.manage_roles"]}
      />,
    );

    expect(screen.getByRole("link", { name: "Administración" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Moderación" })).toHaveAttribute("href", "/moderation");
  });

  it("un curador con editorial.author ve administración sin permisos de moderación", () => {
    renderWithIntl(
      <Header
        user={{ id: "u1", username: "ana", displayName: "Ana" }}
        platformPermissions={["editorial.author"]}
      />,
    );

    expect(screen.getByRole("link", { name: "Administración" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("link", { name: "Moderación" })).not.toBeInTheDocument();
  });
});
