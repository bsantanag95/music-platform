// Pantallas del área de ajustes del dueño (spec owner-settings, "Área de
// ajustes con una pantalla por tipo de ajuste"). El orden del array es el
// orden del menú lateral. Una pantalla solo se lista cuando ofrece al menos un
// control disponible.

export type SettingsScreenId = "profile" | "curation" | "privacy" | "network" | "account";

export interface SettingsScreen {
  id: SettingsScreenId;
  href: string;
}

export const SETTINGS_SCREENS: readonly SettingsScreen[] = [
  { id: "profile", href: "/me/settings/profile" },
  { id: "curation", href: "/me/settings/curation" },
  { id: "privacy", href: "/me/settings/privacy" },
  { id: "network", href: "/me/settings/network" },
  { id: "account", href: "/me/settings/account" },
];

/** Ruta a la que redirige `/me/settings`. */
export const SETTINGS_DEFAULT_HREF = SETTINGS_SCREENS[0]!.href;
