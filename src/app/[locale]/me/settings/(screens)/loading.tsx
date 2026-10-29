import { getTranslations } from "next-intl/server";

// Bloque del esqueleto: tono del borde para que se vea sobre la tarjeta (el `Skeleton` común usa el mismo fondo que
// `SettingsCard`) y sin `role` propio; la sección entera ya se anuncia como ocupada.
function Bar({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-ink-border/60 ${className}`} />;
}

// Mientras carga una pantalla de ajustes, el layout y el menú se mantienen (con la pantalla de destino marcada) y el
// contenido muestra la forma de una pantalla: título, intro y dos tarjetas (openspec: refine-settings-phase1, D3).
export default async function SettingsLoading() {
  const t = await getTranslations("users");
  return (
    <section aria-busy="true" aria-label={t("settings.loading")} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Bar className="h-6 w-40" />
        <Bar className="h-4 w-72 max-w-full" />
      </div>
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-5">
          <Bar className="h-4 w-32" />
          <Bar className="h-9 w-full" />
          <Bar className="h-9 w-2/3" />
        </div>
      ))}
    </section>
  );
}
