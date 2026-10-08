import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CommentTopicLabel } from "./CommentTopicLabel";

describe("CommentTopicLabel", () => {
  it.each([
    ["start", "Para empezar"],
    ["albums", "Álbumes"],
    ["songs", "Canciones"],
    ["general", "General"],
  ] as const)("muestra el nombre del tema %s", (topic, name) => {
    renderWithIntl(<CommentTopicLabel topic={topic} />);
    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it("no renderiza nada sin tema", () => {
    const { container } = renderWithIntl(<CommentTopicLabel topic={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
