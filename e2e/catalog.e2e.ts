// Flujo 2 — Buscar y abrir un álbum (feature-map.md, F2).

import { expect, test } from "@playwright/test";
import { ALBUM_TITLE, ARTIST_NAME, TRACK_TITLES } from "./lib/fixtures";
import { waitForHydration } from "./lib/hydration";

test("busca un álbum por título, lo abre y ve su ficha con la lista de canciones", async ({ page }) => {
  await page.goto("/es/search?type=album");
  // El cuadro del encabezado tiene el mismo nombre accesible: se acota al contenido principal.
  const main = page.getByRole("main");
  await waitForHydration(main.getByRole("combobox", { name: "Texto a buscar" }));

  await main.getByRole("combobox", { name: "Texto a buscar" }).fill("Álbum E2E");
  await main.getByRole("button", { name: "Buscar", exact: true }).click();

  const result = page.getByRole("link", { name: new RegExp(ALBUM_TITLE) });
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/es\/album\//);
  await expect(page.getByRole("heading", { name: ALBUM_TITLE, level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: ARTIST_NAME }).first()).toBeVisible();

  const songs = page.getByRole("region", { name: "Canciones" });
  for (const title of TRACK_TITLES) {
    await expect(songs.getByRole("link", { name: title })).toBeVisible();
  }
});

test("una búsqueda sin coincidencias en el catálogo no rompe la página", async ({ page }) => {
  await page.goto("/es/search?type=album&q=zzz-no-existe-e2e");
  await expect(page.getByRole("heading", { name: "Buscar", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(ALBUM_TITLE) })).toHaveCount(0);
});
