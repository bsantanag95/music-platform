import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next-intl/server", () => ({
  getMessages: vi.fn().mockResolvedValue({
    common: { login: "Entrar", appName: "App" },
    users: { title: "Usuarios", avatar: { helpText: "Ayuda" } },
  }),
}));
vi.mock("./client-messages.json", () => ({
  default: { layout: ["common.login"], "me/settings/(screens)/profile/page": ["users.avatar"] },
}));

// `src/test/setup.ts` deja `withClientMessages` sin efecto para el resto de las pruebas.
const { ClientMessages, withClientMessages } =
  await vi.importActual<typeof import("./client-messages")>("./client-messages");
const { NestedMessages } = await import("./NestedMessages");

type ProviderProps = { messages: unknown; children: unknown };

describe("ClientMessages", () => {
  it("el layout raíz entrega solo sus rutas con el proveedor de next-intl", async () => {
    const element = (await ClientMessages({ scope: "layout" as never, children: "x" })) as ReactElement<ProviderProps>;
    expect(element.type).not.toBe(NestedMessages);
    expect(element.props.messages).toEqual({ common: { login: "Entrar" } });
  });

  it("una página suma solo lo suyo con NestedMessages", async () => {
    const element = (await ClientMessages({
      scope: "me/settings/(screens)/profile/page" as never,
      children: "x",
    })) as ReactElement<ProviderProps>;
    expect(element.type).toBe(NestedMessages);
    expect(element.props.messages).toEqual({ users: { avatar: { helpText: "Ayuda" } } });
  });

  it("withClientMessages envuelve la ruta entera con su proveedor", () => {
    function Page({ id }: { id: string }) {
      return id;
    }
    const Scoped = withClientMessages("me/settings/(screens)/profile/page" as never, Page);
    const element = (Scoped as unknown as (props: { id: string }) => ReactElement<{ scope: string; children: ReactElement }>)({
      id: "1",
    });
    expect(element.type).toBe(ClientMessages);
    expect(element.props.scope).toBe("me/settings/(screens)/profile/page");
    expect(element.props.children.type).toBe(Page);
    expect(element.props.children.props).toEqual({ id: "1" });
  });
});
