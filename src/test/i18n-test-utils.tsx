import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import commonEs from "../../messages/es/common.json";
import catalogEs from "../../messages/es/catalog.json";
import errorsEs from "../../messages/es/errors.json";
import commonEn from "../../messages/en/common.json";
import catalogEn from "../../messages/en/catalog.json";
import errorsEn from "../../messages/en/errors.json";

const messagesByLocale = {
  es: { common: commonEs, catalog: catalogEs, errors: errorsEs },
  en: { common: commonEn, catalog: catalogEn, errors: errorsEn },
};

export function renderWithIntl(
  ui: ReactElement,
  locale: "es" | "en" = "es",
): RenderResult {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}
