// Flujo 4 — Añadir un álbum a una lista (feature-map.md, F4). Usa la sesión del usuario de prueba.

import { expect, test } from "@playwright/test";
import { ALBUM_TITLE, LIST_TITLE, USER } from "./lib/fixtures";
import { waitForHydration } from "./lib/hydration";
import { es, seedPaths } from "./lib/paths";

test("añade el álbum a una lista propia y lo ve dentro de la lista", async ({ page }) => {
  await page.goto(es(seedPaths().albumPath));
  const panel = page.getByRole("complementary", { name: "Tu relación" });
  const choose = panel.getByRole("button", { name: "Elegir listas" });
  await waitForHydration(choose);
  await choose.click();

  const picker = panel.getByRole("group", { name: "Tus listas y listas para completar" });
  const listOption = picker.getByRole("checkbox", { name: new RegExp(LIST_TITLE) });
  await expect(listOption).toBeVisible();
  await listOption.check();
  await expect(listOption).toBeChecked();
  await picker.getByRole("button", { name: "Listo" }).click();

  await expect(panel.getByText("En 1 de tus listas")).toBeVisible();

  // La lista ya contiene el álbum.
  await page.goto(es(`/users/${USER.username}/lists`));
  await page.getByRole("link", { name: new RegExp(LIST_TITLE) }).first().click();
  await expect(page.getByRole("heading", { name: LIST_TITLE, level: 1 })).toBeVisible();
  await expect(page.getByText(ALBUM_TITLE).first()).toBeVisible();
});
