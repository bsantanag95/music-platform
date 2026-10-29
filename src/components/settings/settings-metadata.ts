import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { SettingsScreenId } from "./settings-screens";

// Título de una pantalla de ajustes en la pestaña del navegador: "<Pantalla> · Ajustes", con el mismo nombre que el
// menú lateral (openspec: refine-settings-phase1, D4).
export async function settingsMetadata(screen: SettingsScreenId): Promise<Metadata> {
  const t = await getTranslations("users");
  return { title: `${t(`settings.nav.${screen}`)} · ${t("settings.title")}` };
}
