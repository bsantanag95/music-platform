import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { render, screen, within } from "@testing-library/react";
import usersEs from "../../../messages/es/users.json";
import usersEn from "../../../messages/en/users.json";
import { ProfileIdentity } from "./ProfileIdentity";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

// Traductor real (mensajes es/en), no un simulado: lo que se comprueba es el
// texto accesible que oirá una persona con lector de pantalla.
const translator = (locale: "es" | "en") =>
  createTranslator({
    locale,
    messages: { users: locale === "es" ? usersEs : usersEn },
    namespace: "users",
  }) as unknown as (key: string, values?: Record<string, string | number>) => string;

const base: ProfileView = {
  id: "u1",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "public",
  bio: null,
  pronouns: null,
  location: null,
  timezone: null,
  avatarUrl: null,
  memberSince: new Date("2025-01-01T00:00:00Z"),
  links: [],
  followerCount: 0,
  followingCount: 0,
  relation: "none",
  accessible: true,
  blockedByMe: false,
  isOwner: false,
};

type LinkRow = ProfileView["links"][number];
const link = (kind: LinkRow["kind"], url: string, id: string = kind): LinkRow => ({ id, kind, url, position: 0 });

function renderLinks(links: LinkRow[], locale: "es" | "en" = "es") {
  return render(
    <ProfileIdentity profile={{ ...base, links }} t={translator(locale)} memberSinceDate="enero de 2025" />,
  );
}

describe("enlaces del perfil como íconos", () => {
  it("muestra el ícono de la red, sin el nombre como texto visible", () => {
    const { container } = renderLinks([link("instagram", "https://www.instagram.com/ana")]);

    const anchor = screen.getByRole("link", { name: "Instagram: @ana" });
    expect(anchor).toHaveAttribute("href", "https://www.instagram.com/ana");
    expect(anchor).toHaveTextContent("");
    expect(container.querySelector('svg[data-icon="instagram"]')).toBeInTheDocument();
    expect(screen.queryByText("Instagram")).not.toBeInTheDocument();
  });

  it("el nombre accesible y el tooltip llevan el sitio y el usuario", () => {
    renderLinks([link("x", "https://x.com/ana_99"), link("lastfm", "https://www.last.fm/user/ana_fm")]);

    expect(screen.getByRole("link", { name: "X: @ana_99" })).toHaveAttribute("title", "X: @ana_99");
    // Last.fm no usa arroba.
    expect(screen.getByRole("link", { name: "Last.fm: ana_fm" })).toBeInTheDocument();
  });

  it("los nueve tipos por usuario tienen su propio ícono", () => {
    const { container } = renderLinks([
      link("instagram", "https://www.instagram.com/ana"),
      link("x", "https://x.com/ana"),
      link("tiktok", "https://www.tiktok.com/@ana"),
      link("youtube", "https://www.youtube.com/@ana"),
      link("soundcloud", "https://soundcloud.com/ana"),
      link("bandcamp", "https://ana.bandcamp.com"),
      link("lastfm", "https://www.last.fm/user/ana"),
      link("discogs", "https://www.discogs.com/user/ana"),
      link("spotify", "https://open.spotify.com/user/ana"),
    ]);

    const icons = [...container.querySelectorAll("svg[data-icon]")].map((svg) => svg.getAttribute("data-icon"));
    expect(icons).toEqual([
      "instagram", "x", "tiktok", "youtube", "soundcloud", "bandcamp", "lastfm", "discogs", "spotify",
    ]);
    // Cada ícono de marca dibuja algo distinto.
    const paths = [...container.querySelectorAll("svg path")].map((p) => p.getAttribute("d"));
    expect(new Set(paths).size).toBe(9);
  });

  it("un enlace muestra la cadena y el dominio (sin www) en el nombre accesible", () => {
    const { container } = renderLinks([link("other", "https://www.link.com/inicio")]);

    expect(screen.getByRole("link", { name: "Enlace: link.com" })).toHaveAttribute(
      "href",
      "https://www.link.com/inicio",
    );
    const icons = [...container.querySelectorAll("svg[data-icon]")].map((svg) => svg.getAttribute("data-icon"));
    expect(icons).toEqual(["link"]);
  });

  it("un enlace de un tipo por usuario que no coincide con su sitio usa el ícono genérico", () => {
    const { container } = renderLinks([link("instagram", "http://instagram.com")]);

    expect(container.querySelector('svg[data-icon="instagram"]')).not.toBeInTheDocument();
    expect(container.querySelector('svg[data-icon="link"]')).toBeInTheDocument();
    // Sigue siendo un enlace válido y con nombre: el sitio y el dominio guardado.
    expect(screen.getByRole("link", { name: "Instagram: instagram.com" })).toHaveAttribute(
      "href",
      "http://instagram.com",
    );
  });

  it("un tipo por usuario que apunta a otro sitio también usa el ícono genérico", () => {
    const { container } = renderLinks([link("instagram", "https://www.aaa.com/x")]);
    expect(container.querySelector('svg[data-icon="link"]')).toBeInTheDocument();
  });

  it("los íconos son decorativos para las tecnologías de asistencia", () => {
    const { container } = renderLinks([link("tiktok", "https://www.tiktok.com/@ana")]);
    const svg = container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("abre en pestaña nueva con rel seguro", () => {
    renderLinks([link("spotify", "https://open.spotify.com/user/ana")]);
    const anchor = screen.getByRole("link", { name: "Spotify: ana" });
    expect(anchor).toHaveAttribute("target", "_blank");
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer nofollow");
  });

  it("conserva el orden de los enlaces y la lista tiene nombre accesible", () => {
    renderLinks([
      link("other", "https://ana.example", "a"),
      link("bandcamp", "https://ana.bandcamp.com", "b"),
    ]);

    const list = screen.getByRole("list", { name: "Enlaces del perfil" });
    const names = within(list).getAllByRole("link").map((a) => a.getAttribute("aria-label"));
    expect(names).toEqual(["Enlace: ana.example", "Bandcamp: ana"]);
  });

  it("no renderiza la lista si no hay enlaces", () => {
    renderLinks([]);
    expect(screen.queryByRole("list", { name: "Enlaces del perfil" })).not.toBeInTheDocument();
  });

  it("los nombres accesibles también están en inglés", () => {
    renderLinks([link("other", "https://ana.example", "a"), link("instagram", "https://www.instagram.com/ana", "b")], "en");
    expect(screen.getByRole("link", { name: "Link: ana.example" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Instagram: @ana" })).toBeInTheDocument();
  });
});
