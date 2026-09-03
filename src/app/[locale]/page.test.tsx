import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import type { ReactElement } from "react";
import * as auth from "@/services/auth/authorization";

type PageModule = { default: () => Promise<ReactElement> };
let pageModule: PageModule;

const AuthenticatedHome = () => null;
const AnonymousHome = () => null;

vi.mock("@/components/home/AuthenticatedHome", () => ({ AuthenticatedHome }));
vi.mock("@/components/home/AnonymousHome", () => ({ AnonymousHome }));
vi.mock("@/services/auth/authorization", () => ({ getCurrentUser: vi.fn() }));

beforeAll(async () => {
  pageModule = (await vi.importActual("./page")) as PageModule;
});

describe("HomePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("visitante sin sesión: renderiza el Inicio anónimo", async () => {
    vi.mocked(auth.getCurrentUser).mockResolvedValue(null);

    const element = await pageModule.default();

    expect(element.type).toBe(AnonymousHome);
  });

  it("usuario con sesión: renderiza el Inicio con sesión y le pasa el usuario", async () => {
    const user = { id: "u1", username: "yo", displayName: null };
    vi.mocked(auth.getCurrentUser).mockResolvedValue(
      user as Awaited<ReturnType<typeof auth.getCurrentUser>>,
    );

    const element = await pageModule.default();

    expect(element.type).toBe(AuthenticatedHome);
    expect(element.props).toMatchObject({ user });
  });
});
