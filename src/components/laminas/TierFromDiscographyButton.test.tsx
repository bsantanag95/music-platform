import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/api/laminas", () => ({ createTierList: mocks.create }));

import { TierFromDiscographyButton } from "./TierFromDiscographyButton";

const ARTIST = "30000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("TierFromDiscographyButton", () => {
  it("la crea en un toque desde la discografía y lleva al editor", async () => {
    mocks.create.mockResolvedValue({ id: "t1" });
    renderWithIntl(<TierFromDiscographyButton artistId={ARTIST} artistName="Black Sabbath" />);
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(mocks.create).toHaveBeenCalledWith({
      title: "Tier list de Black Sabbath",
      entityType: "release-group",
      source: { type: "discography", artistId: ARTIST },
    });
    expect(mocks.push).toHaveBeenCalledWith("/me/cards/t1");
  });

  it("si falla, avisa y se puede volver a intentar", async () => {
    mocks.create.mockRejectedValue(new Error("400"));
    renderWithIntl(<TierFromDiscographyButton artistId={ARTIST} artistName="Black Sabbath" />);
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo armar");
    expect(screen.getByRole("button", { name: "Armar tier list" })).toBeEnabled();
  });
});
