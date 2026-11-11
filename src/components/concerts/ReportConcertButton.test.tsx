import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import concertsEs from "../../../messages/es/concerts.json";
import { ReportConcertButton } from "./ReportConcertButton";

// "Reportar" un concierto (openspec: add-shared-concerts-phase2): motivo cerrado, texto opcional y confirmación.

const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("@/lib/api/concerts", () => ({ reportSharedConcert: mocks.report }));

const t = concertsEs.community.report;
const CONCERT = "00000000-0000-4000-8000-0000000000c1";

beforeEach(() => vi.clearAllMocks());

describe("ReportConcertButton", () => {
  it("envía el motivo elegido y el texto, y agradece", async () => {
    mocks.report.mockResolvedValue({ report: { id: "r1" } });
    renderWithIntl(<ReportConcertButton concertId={CONCERT} />);

    fireEvent.click(screen.getByRole("button", { name: t.open }));
    fireEvent.click(screen.getByRole("radio", { name: t.reasons.duplicate }));
    fireEvent.change(screen.getByLabelText(t.details), { target: { value: " Es el mismo del 16 " } });
    fireEvent.click(screen.getByRole("button", { name: t.submit }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(t.sent));
    expect(mocks.report).toHaveBeenCalledWith(CONCERT, { reason: "duplicate", details: "Es el mismo del 16" });
  });

  it("un fallo se avisa y deja reintentar", async () => {
    mocks.report.mockRejectedValue(new Error("x"));
    renderWithIntl(<ReportConcertButton concertId={CONCERT} />);
    fireEvent.click(screen.getByRole("button", { name: t.open }));
    fireEvent.click(screen.getByRole("button", { name: t.submit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.error);
    expect(mocks.report).toHaveBeenCalledWith(CONCERT, { reason: "did_not_happen", details: null });
  });
});
