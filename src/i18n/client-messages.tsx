import type { ComponentType, ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import manifest from "./client-messages.json";
import { NestedMessages } from "./NestedMessages";
import { pickMessages, type Messages } from "./pick-messages";

// Textos que recibe el cliente (openspec: trim-client-messages). El layout raíz
// entrega solo los que piden la cabecera, el menú, el pie y las páginas de error;
// cada página o layout con componentes cliente que piden más declara su proveedor
// con `withClientMessages`, que añade únicamente lo que le falta. Qué rutas de
// mensajes van en cada uno lo calcula `scripts/generate-client-messages.ts` sobre
// el código y lo guarda en `client-messages.json`; una prueba falla si quedó viejo.

/** Archivo de ruta (relativo a `src/app/[locale]/`, sin extensión) que declara un proveedor. */
export type ClientMessagesScope = keyof typeof manifest;

export async function ClientMessages({ scope, children }: { scope: ClientMessagesScope; children: ReactNode }) {
  const messages = pickMessages((await getMessages()) as Messages, manifest[scope]);
  // El raíz hereda locale, zona y `now` de `src/i18n/request.ts`; los anidados, del raíz.
  if (scope === "layout") return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
  return <NestedMessages messages={messages}>{children}</NestedMessages>;
}

/**
 * Exporta una página o layout envuelto en su proveedor de textos:
 * `export default withClientMessages("me/feed/page", FeedPage)`. Envuelve el
 * componente entero, así que cubre cualquier `return` de la ruta. Conserva el
 * tipo de la ruta para que Next valide sus `params` y las pruebas la llamen
 * igual (en las pruebas `src/test/setup.ts` devuelve la ruta sin envolver).
 */
export function withClientMessages<Route extends (props: never) => ReactNode | Promise<ReactNode>>(
  scope: Exclude<ClientMessagesScope, "layout">,
  route: Route,
): Route {
  const Component = route as unknown as ComponentType<object>;
  function ScopedRoute(props: object) {
    return (
      <ClientMessages scope={scope}>
        <Component {...props} />
      </ClientMessages>
    );
  }
  return ScopedRoute as unknown as Route;
}
