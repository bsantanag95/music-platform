import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ resolveUsernameAlias: vi.fn(), redirect: vi.fn(), getLocale: vi.fn() }));

vi.mock("@/services/auth/username", () => ({ resolveUsernameAlias: mocks.resolveUsernameAlias }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next-intl/server", () => ({ getLocale: mocks.getLocale }));

import { redirectIfRenamed } from "./renamed-redirect";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLocale.mockResolvedValue("es");
});

describe("redirectIfRenamed", () => {
  it("redirige a la misma ruta bajo el usuario nuevo mientras dure la reserva", async () => {
    mocks.resolveUsernameAlias.mockResolvedValue("besan_music");
    await redirectIfRenamed("besantanag95", "/favorites");
    expect(mocks.redirect).toHaveBeenCalledWith("/es/users/besan_music/favorites");
  });

  it("redirige el perfil raíz sin subruta", async () => {
    mocks.resolveUsernameAlias.mockResolvedValue("besan_music");
    await redirectIfRenamed("besantanag95");
    expect(mocks.redirect).toHaveBeenCalledWith("/es/users/besan_music");
  });

  it("usa el idioma de la ruta en curso", async () => {
    mocks.getLocale.mockResolvedValue("en");
    mocks.resolveUsernameAlias.mockResolvedValue("besan_music");
    await redirectIfRenamed("besantanag95", "/connections/followers");
    expect(mocks.redirect).toHaveBeenCalledWith("/en/users/besan_music/connections/followers");
  });

  it("no hace nada cuando el usuario no es un alias vigente (reserva vencida o inexistente)", async () => {
    mocks.resolveUsernameAlias.mockResolvedValue(null);
    await redirectIfRenamed("nadie", "/diary");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
