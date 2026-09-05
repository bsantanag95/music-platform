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
    useTranslations: () => (key: string) => {
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
        openMenu: "Abrir menú",
        closeMenu: "Cerrar menú",
      };
        return map[key] ?? key;
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

  it("el botón de menú mobile despliega la navegación, sesión e idioma plegados", () => {
    renderWithIntl(
      <Header user={{ id: "u1", username: "ana", displayName: "Ana" }} />,
    );

    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getAllByRole("link", { name: "Diario" })).toHaveLength(1);

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // Plegado abierto: ahora hay dos copias (escritorio oculta por CSS + panel mobile).
    expect(screen.getAllByRole("link", { name: "Diario" })).toHaveLength(2);
  });
});
