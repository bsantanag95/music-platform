// Flujo 5 — Perfil propio y perfil de otra persona (feature-map.md, F5).

import { expect, test } from "@playwright/test";
import { LIST_TITLE, USER } from "./lib/fixtures";
import { waitForHydration } from "./lib/hydration";
import { es, seedPaths } from "./lib/paths";

test("el perfil propio muestra su identidad, sus listas y las acciones del dueño", async ({ page }) => {
  await page.goto(es(seedPaths().profilePath));
  await expect(page.getByRole("heading", { name: USER.username, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar perfil" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver como visitante" })).toBeVisible();
  await expect(page.getByRole("heading", { name: LIST_TITLE, level: 3 })).toBeVisible();
});

test("sigue a otra persona desde su perfil público", async ({ page }) => {
  await page.goto(es(seedPaths().otherProfilePath));
  await expect(page.getByRole("heading", { name: USER.otherUsername, level: 1 })).toBeVisible();

  // El perfil ofrece «Seguir» en la cabecera y también en el aviso de contenido solo para seguidores: se usa el primero.
  const follow = page.getByRole("button", { name: "Seguir", exact: true }).first();
  await waitForHydration(follow);
  await follow.click();
  await expect(page.getByRole("button", { name: /Siguiendo|Dejar de seguir/ }).first()).toBeVisible();
});

test.describe("sin sesión", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("un visitante ve el perfil público y se le invita a iniciar sesión para seguir", async ({ page }) => {
    await page.goto(es(seedPaths().otherProfilePath));
    await expect(page.getByRole("heading", { name: USER.otherUsername, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Iniciar sesión para seguir" }).first()).toBeVisible();
  });
});
