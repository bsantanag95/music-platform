import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityTabs } from "./ActivityTabs";

const sectionMock = vi.fn<(props: { source: string }) => React.ReactElement>(({ source }) => (
  <div data-testid="panel">{source}</div>
));
vi.mock("./CommunityActivitySection", () => ({
  CommunityActivitySection: (props: { source: string }) => sectionMock(props),
}));

const emptyPage = { entries: [], page: 1, pageSize: 10, hasNext: false };
const tabs = [
  { key: "recent" as const, label: "Recientes", initial: emptyPage },
  { key: "from-following" as const, label: "De la gente que seguís", initial: emptyPage },
  { key: "own" as const, label: "Tu actividad", initial: emptyPage },
];

describe("ActivityTabs", () => {
  it("arranca en la primera pestaña y monta solo su panel", () => {
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" emptyMessage="Nada" />);

    expect(screen.getByTestId("panel")).toHaveTextContent("recent");
    expect(screen.getByRole("tab", { name: "Recientes" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Tu actividad" })).toHaveAttribute("aria-selected", "false");
  });

  it("hacer click en otra pestaña cambia el panel montado", async () => {
    const user = userEvent.setup();
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" emptyMessage="Nada" />);

    await user.click(screen.getByRole("tab", { name: "Tu actividad" }));

    expect(screen.getByTestId("panel")).toHaveTextContent("own");
    expect(screen.getByRole("tab", { name: "Tu actividad" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Recientes" })).toHaveAttribute("aria-selected", "false");
  });

  it("la flecha derecha del teclado avanza a la siguiente pestaña", async () => {
    const user = userEvent.setup();
    render(<ActivityTabs tabs={tabs} tablistLabel="Secciones de actividad" emptyMessage="Nada" />);

    screen.getByRole("tab", { name: "Recientes" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByTestId("panel")).toHaveTextContent("from-following");
  });
});
