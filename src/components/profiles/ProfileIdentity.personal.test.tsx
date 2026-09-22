import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { createTranslator } from "next-intl";
import { render, screen } from "@testing-library/react";
import usersEs from "../../../messages/es/users.json";
import usersEn from "../../../messages/en/users.json";
import { ProfileIdentity } from "./ProfileIdentity";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

// Traductor real (mensajes es/en), no uno simulado: lo que se comprueba es el texto que
// verá y oirá quien mira el perfil (spec profile-personal-info, "Cómo se muestran en la Placa").
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
  memberSince: new Date("2025-01-01T00:00:00Z"),
  links: [],
  followerCount: 3,
  followingCount: 4,
  relation: "none",
  accessible: true,
  blockedByMe: false,
  isOwner: false,
};

function renderIdentity(
  over: Partial<ProfileView> = {},
  extra: { locale?: "es" | "en"; countryLabel?: string | null; localTime?: string | null; minimal?: boolean } = {},
) {
  const { locale = "es", ...rest } = extra;
  return render(
    <ProfileIdentity
      profile={{ ...base, ...over }}
      t={translator(locale)}
      memberSinceDate={locale === "es" ? "enero de 2025" : "January 2025"}
      {...rest}
    />,
  );
}

// La línea de datos: "Ciudad, País · Miembro desde … · hora local".
const dataLine = () => screen.getByText(/Miembro desde|Member since/).closest("p")!;

describe("pronombres junto al nombre", () => {
  it.each([
    ["he", "él", "he/him"],
    ["she", "ella", "she/her"],
    ["they", "elle", "they/them"],
  ] as const)("la clave %s se muestra «%s» en español y «%s» en inglés", (pronounSet, es, en) => {
    const first = renderIdentity({ pronounSet });
    expect(screen.getByText(es)).toBeInTheDocument();
    first.unmount();

    renderIdentity({ pronounSet }, { locale: "en" });
    expect(screen.getByText(en)).toBeInTheDocument();
  });

  it("la etiqueta está junto al nombre, dentro del mismo encabezado", () => {
    renderIdentity({ pronounSet: "she" });
    const chip = screen.getByText("ella");
    expect(chip.parentElement).toContainElement(screen.getByRole("heading", { name: "Ana" }));
  });

  it("tiene un nombre accesible que dice que son pronombres", () => {
    renderIdentity({ pronounSet: "she" });
    expect(screen.getByLabelText("Pronombres: ella")).toBeInTheDocument();
  });

  it("«Otro» muestra el texto libre tal cual", () => {
    renderIdentity({ pronouns: "ellx" });
    expect(screen.getByText("ellx")).toBeInTheDocument();
  });

  it("la clave de la lista manda si (por un dato inconsistente) hay también texto libre", () => {
    renderIdentity({ pronounSet: "he", pronouns: "ellx" });
    expect(screen.getByText("él")).toBeInTheDocument();
    expect(screen.queryByText("ellx")).not.toBeInTheDocument();
  });

  it("sin pronombres no muestra etiqueta", () => {
    renderIdentity();
    expect(screen.queryByLabelText(/Pronombres/)).not.toBeInTheDocument();
  });

  it("la variante mínima (solo nombre y usuario) no los muestra", () => {
    renderIdentity({ pronounSet: "she" }, { minimal: true });
    expect(screen.queryByText("ella")).not.toBeInTheDocument();
  });
});

describe("línea de datos: ciudad, país, alta y hora local", () => {
  it("ciudad y país van al inicio: «Santiago, Chile · Miembro desde …»", () => {
    renderIdentity({ location: "Santiago", country: "CL" }, { countryLabel: "Chile" });
    expect(dataLine()).toHaveTextContent("Santiago, Chile · Miembro desde enero de 2025");
  });

  it("solo país: se muestra el país, sin coma ni separador sobrante", () => {
    renderIdentity({ country: "CL" }, { countryLabel: "Chile" });
    expect(dataLine()).toHaveTextContent("Chile · Miembro desde enero de 2025");
    expect(dataLine().textContent).not.toMatch(/^,|, ·/);
  });

  it("solo ciudad: se muestra la ciudad", () => {
    renderIdentity({ location: "Valparaíso" });
    expect(dataLine()).toHaveTextContent("Valparaíso · Miembro desde enero de 2025");
  });

  it("con la hora local, va al final: «Ciudad, País · Miembro desde … · 18:04 hora local»", () => {
    renderIdentity({ location: "Santiago", country: "CL" }, { countryLabel: "Chile", localTime: "18:04" });
    expect(dataLine()).toHaveTextContent("Santiago, Chile · Miembro desde enero de 2025 · 18:04 hora local");
  });

  it("el país en inglés se ve tal cual lo calculó el servidor", () => {
    renderIdentity({ location: "Madrid", country: "ES" }, { locale: "en", countryLabel: "Spain" });
    expect(dataLine()).toHaveTextContent("Madrid, Spain · Member since January 2025");
  });

  it("un código de país sin nombre calculado no se muestra como código", () => {
    renderIdentity({ country: "CL" });
    expect(dataLine()).toHaveTextContent(/^Miembro desde enero de 2025$/);
    expect(dataLine().textContent).not.toContain("CL");
  });

  it("un perfil sin ninguno de los tres datos se ve igual que antes: solo «Miembro desde …»", () => {
    renderIdentity();
    expect(dataLine().textContent).toBe("Miembro desde enero de 2025");
    expect(screen.queryByLabelText(/Pronombres/)).not.toBeInTheDocument();
  });

  it("con la hora local y sin ubicación, la línea empieza por el alta", () => {
    renderIdentity({}, { localTime: "09:15" });
    expect(dataLine()).toHaveTextContent("Miembro desde enero de 2025 · 09:15 hora local");
  });
});
