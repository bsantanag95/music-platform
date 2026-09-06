import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import commonEs from "../../messages/es/common.json";
import catalogEs from "../../messages/es/catalog.json";
import errorsEs from "../../messages/es/errors.json";
import commonEn from "../../messages/en/common.json";
import catalogEn from "../../messages/en/catalog.json";
import errorsEn from "../../messages/en/errors.json";
import authEs from "../../messages/es/auth.json";
import authEn from "../../messages/en/auth.json";
import usersEs from "../../messages/es/users.json";
import usersEn from "../../messages/en/users.json";
import diaryEs from "../../messages/es/diary.json";
import diaryEn from "../../messages/en/diary.json";
import feedEs from "../../messages/es/feed.json";
import feedEn from "../../messages/en/feed.json";
import collectionEs from "../../messages/es/collection.json";
import collectionEn from "../../messages/en/collection.json";
import listsEs from "../../messages/es/lists.json";
import listsEn from "../../messages/en/lists.json";
import favoritesEs from "../../messages/es/favorites.json";
import favoritesEn from "../../messages/en/favorites.json";

const messagesByLocale = {
  es: {
    common: commonEs,
    catalog: catalogEs,
    errors: errorsEs,
    auth: authEs,
    users: usersEs,
    diary: diaryEs,
    feed: feedEs,
    collection: collectionEs,
    lists: listsEs,
    favorites: favoritesEs,
  },
  en: {
    common: commonEn,
    catalog: catalogEn,
    errors: errorsEn,
    auth: authEn,
    users: usersEn,
    diary: diaryEn,
    feed: feedEn,
    collection: collectionEn,
    lists: listsEn,
    favorites: favoritesEn,
  },
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
