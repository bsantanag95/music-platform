import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { SETTINGS_DEFAULT_HREF } from "@/components/settings/settings-screens";

// `/me/settings` es solo la puerta del área: aterriza en la pantalla Perfil.
// Así el "Ajustes" del menú de usuario y cualquier enlace anterior a esta ruta
// siguen funcionando (spec owner-settings). La guarda de sesión la hace el
// layout y cada pantalla.
export default async function SettingsIndexPage() {
  redirect({ href: SETTINGS_DEFAULT_HREF, locale: await getLocale() });
}
