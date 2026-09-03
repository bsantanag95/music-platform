"use client";

import { useState, useTransition, type SubmitEventHandler } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface SearchFormProps {
  // Valor con el que llega `/search?q=...` — solo prellena el campo. La
  // búsqueda la ejecuta la página como Server Component; este formulario ya
  // no resuelve nada ni navega a `/artist/<id>`.
  initialQuery?: string;
}

export function SearchForm({ initialQuery = "" }: SearchFormProps) {
  const router = useRouter();
  const t = useTranslations("catalog");
  const [query, setQuery] = useState(initialQuery);
  const [validationError, setValidationError] = useState<string | undefined>();
  const [isNavigating, startTransition] = useTransition();

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const normalized = query.trim();

    if (!normalized) {
      setValidationError(t("search.validationEmpty"));
      return;
    }

    setValidationError(undefined);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(normalized)}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 max-w-md">
      <Input
        label={t("search.fieldLabel")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        error={validationError}
        disabled={isNavigating}
        placeholder={t("search.placeholder")}
      />
      <Button type="submit" variant="primary" disabled={isNavigating}>
        {isNavigating ? t("search.submitting") : t("search.submit")}
      </Button>
      {isNavigating && (
        <p className="text-sm text-paper-muted" role="status">
          {t("search.loading")}
        </p>
      )}
    </form>
  );
}
