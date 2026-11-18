// Espera a que React haya hidratado un elemento antes de interactuar con él. Sin esto, en `next dev` (que compila
// cada ruta al primer acceso) un clic llega antes que los handlers y el formulario se envía como un GET nativo.
// Es una espera por condición (no un `sleep`): los elementos hidratados llevan las props de React en sus claves.

import { expect, type Locator } from "@playwright/test";

export async function waitForHydration(target: Locator): Promise<void> {
  await expect
    .poll(() => target.first().evaluate((el) => Object.keys(el).some((k) => k.startsWith("__reactProps"))), {
      message: "el elemento no se hidrató",
      timeout: 30_000,
    })
    .toBe(true);
}
