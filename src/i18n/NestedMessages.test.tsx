import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useFormatter, useTranslations } from "next-intl";
import { NestedMessages } from "./NestedMessages";

function Probe() {
  const tCommon = useTranslations("common");
  const tUsers = useTranslations("users");
  const format = useFormatter();
  return (
    <p>
      {tCommon("appName")} · {tUsers("title")} · {format.dateTime(new Date("2026-10-01T02:00:00Z"), { day: "numeric" })}
    </p>
  );
}

describe("NestedMessages", () => {
  it("suma sus textos a los del proveedor padre y conserva locale y zona", () => {
    render(
      <NextIntlClientProvider locale="es" timeZone="America/Santiago" messages={{ common: { appName: "App" } }}>
        <NestedMessages messages={{ users: { title: "Usuarios" } }}>
          <Probe />
        </NestedMessages>
      </NextIntlClientProvider>,
    );
    // 02:00 UTC del 1/10 es todavía 30/9 en Santiago: la zona del padre llega al anidado.
    expect(screen.getByText("App · Usuarios · 30")).toBeInTheDocument();
  });
});
