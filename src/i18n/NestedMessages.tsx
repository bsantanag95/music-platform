"use client";

import { useMemo, type ReactNode } from "react";
import { NextIntlClientProvider, useLocale, useMessages, useNow, useTimeZone } from "next-intl";
import { mergeMessages, type Messages } from "./pick-messages";

/**
 * Suma los textos de una página o layout a los que ya entrega el proveedor que
 * la rodea (openspec: trim-client-messages). Un `NextIntlClientProvider`
 * anidado reemplaza el contexto en vez de combinarlo, así que se fusiona aquí y
 * se reenvían locale, zona y `now` del padre (la app no configura `formats`).
 */
export function NestedMessages({ messages, children }: { messages: Messages; children: ReactNode }) {
  const parent = useMessages() as Messages;
  const locale = useLocale();
  const timeZone = useTimeZone();
  const now = useNow();
  const merged = useMemo(() => mergeMessages(parent, messages), [parent, messages]);
  return (
    <NextIntlClientProvider locale={locale} timeZone={timeZone} now={now} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
}
