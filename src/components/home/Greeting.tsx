import { getTranslations } from "next-intl/server";

// Saludo breve del Inicio con sesión. Una línea, sin conteos ni fechas
// derivadas: es un recibimiento, no un panel de progreso (ver
// docs/05-features/home.md, anti-feature "sin gamificación").
export async function Greeting({ name }: { name: string }) {
  const t = await getTranslations("home");

  return (
    <p className="font-body text-lg text-paper">{t("greeting", { name })}</p>
  );
}
