// Flujo 3 — Valorar un álbum (feature-map.md, F3). Usa la sesión del usuario de prueba.

import { expect, test } from "@playwright/test";
import { ALBUM_TITLE } from "./lib/fixtures";
import { waitForHydration } from "./lib/hydration";
import { es, seedPaths } from "./lib/paths";

test("valora un álbum con estrellas, la nota persiste y aparece en sus valoraciones", async ({ page }) => {
  await page.goto(es(seedPaths().albumPath));
  const panel = page.getByRole("complementary", { name: "Tu relación" });
  const stars = panel.getByRole("group", { name: "Tu nota en estrellas" });
  await waitForHydration(stars.getByRole("radio").first());

  await stars.getByRole("radio", { name: "4,0 estrellas" }).check({ force: true });
  await expect(stars.getByRole("radio", { name: "4,0 estrellas" })).toBeChecked();

  // Persistencia: tras recargar, la nota sigue ahí.
  await page.reload();
  await expect(
    page.getByRole("complementary", { name: "Tu relación" }).getByRole("radio", { name: "4,0 estrellas" }),
  ).toBeChecked();

  // Y aparece en la página de valoraciones del usuario.
  await page.goto(es("/me/ratings"));
  await expect(page.getByRole("heading", { name: "Valoraciones", level: 1 })).toBeVisible();
  await expect(page.getByText(ALBUM_TITLE).first()).toBeVisible();
});
