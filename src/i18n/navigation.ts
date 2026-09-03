import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, useRouter, usePathname, redirect } =
  createNavigation(routing);

// `createNavigation` de esta versión de next-intl no expone `useSearchParams`;
// se re-exporta el de `next/navigation` para que los consumidores (y sus mocks
// de test) sigan importando toda la navegación desde un único módulo.
export { useSearchParams } from "next/navigation";
