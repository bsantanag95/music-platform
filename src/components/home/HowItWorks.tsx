import { getTranslations } from "next-intl/server";

// Tira de tres pasos para el Inicio anónimo: orienta a un visitante nuevo
// sobre qué es el producto (diario sin fricción, rating dual, grafo social
// explícito) sin convertir la página en una landing de features.
export async function HowItWorks() {
  const t = await getTranslations("home");

  const steps = [1, 2, 3].map((n) => ({
    n,
    title: t(`howItWorksStep${n}Title`),
    body: t(`howItWorksStep${n}Body`),
  }));

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("howItWorksTitle")}</h2>
      <ol className="grid gap-4 sm:grid-cols-3">
        {steps.map((step) => (
          <li
            key={step.n}
            className="flex flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-4"
          >
            <span className="font-data text-xs text-paper-muted">
              {String(step.n).padStart(2, "0")}
            </span>
            <h3 className="font-display text-base text-paper">{step.title}</h3>
            <p className="font-body text-sm text-paper-muted">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
