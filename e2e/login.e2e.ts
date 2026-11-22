// Flujo 1 — Iniciar sesión (feature-map.md, F1). Se hace con una sesión limpia (sin el storageState).

import { expect, test } from "@playwright/test";
import { waitForHydration } from "./lib/hydration";
import { USER } from "./lib/fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

test("inicia sesión con usuario y contraseña y ya no se le ofrece el login", async ({ page }) => {
  await page.goto("/es/auth/login");
  await expect(page.getByRole("heading", { name: "Iniciar sesión", level: 1 })).toBeVisible();
  await waitForHydration(page.locator("form"));

  await page.getByLabel("Email o nombre de usuario").fill(USER.username);
  await page.getByLabel("Contraseña", { exact: true }).fill(USER.password);
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();

  // Sale de la pantalla de login y, con sesión, volver a ella redirige.
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await page.goto("/es/auth/login");
  await expect(page).not.toHaveURL(/\/auth\/login/);
});

test("rechaza una contraseña incorrecta sin iniciar sesión y sin exponerla en la URL", async ({ page }) => {
  await page.goto("/es/auth/login");
  await waitForHydration(page.locator("form"));
  await page.getByLabel("Email o nombre de usuario").fill(USER.username);
  await page.getByLabel("Contraseña", { exact: true }).fill("contraseña-equivocada");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login$/);
  expect(page.url()).not.toContain("password");
});
