import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { TrackListButton } from "./TrackListButton";

const mocks = vi.hoisted(() => ({
  setListTracking: vi.fn(),
}));

vi.mock("@/lib/api/camino", () => ({ setListTracking: mocks.setListTracking }));
vi.mock("@/lib/api/client", () => ({
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string, _status: number, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

const listId = "a1b2c3d4-0000-4000-8000-000000000001";

describe("TrackListButton", () => {
  it("activa el tracking al hacer click", async () => {
    const user = userEvent.setup();
    mocks.setListTracking.mockResolvedValue({ tracking: true });
    renderWithIntl(<TrackListButton listId={listId} initialTracking={false} initialProgress={null} />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(mocks.setListTracking).toHaveBeenCalledWith(listId, true));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("desactiva el tracking sin tocar el guardado", async () => {
    const user = userEvent.setup();
    mocks.setListTracking.mockResolvedValue({ tracking: false });
    renderWithIntl(
      <TrackListButton
        listId={listId}
        initialTracking={true}
        initialProgress={{ selectedCount: 4, listenedCount: 2 }}
      />,
    );

    await user.click(screen.getByRole("button"));

    await waitFor(() => expect(mocks.setListTracking).toHaveBeenCalledWith(listId, false));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("muestra una barra de progreso cuando el tracking está activo", () => {
    renderWithIntl(
      <TrackListButton
        listId={listId}
        initialTracking={true}
        initialProgress={{ selectedCount: 4, listenedCount: 2 }}
      />,
    );
    expect(document.querySelector(".bg-petrol")).toBeInTheDocument();
  });
});
