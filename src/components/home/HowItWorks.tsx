import { getTranslations } from "next-intl/server";
import { FeatureCarousel } from "./FeatureCarousel";

// Funcionalidades del producto en el Inicio anónimo. Antes eran 3 pasos
// ("Cómo funciona"); ahora es un carrusel horizontal con todas las
// capacidades relevantes (diario, rating dual, reseñas, favoritos, listas,
// colección física, seguir, catálogo, privacidad). Server component: resuelve
// i18n y delega el scroll/flechas a FeatureCarousel (client).
const FEATURE_COUNT = 9;

export async function HowItWorks() {
  const t = await getTranslations("home");

  const features = Array.from({ length: FEATURE_COUNT }, (_, i) => ({
    title: t(`feature${i + 1}Title`),
    body: t(`feature${i + 1}Body`),
  }));

  return (
    <FeatureCarousel
      title={t("featuresTitle")}
      features={features}
      prevLabel={t("featuresPrev")}
      nextLabel={t("featuresNext")}
    />
  );
}
