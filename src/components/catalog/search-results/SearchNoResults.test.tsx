import { describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";

const mocks = vi.hoisted(() => ({ findInAllOtherTypes: vi.fn() }));
vi.mock("@/services/catalog/search/other-type", () => ({ findInAllOtherTypes: mocks.findInAllOtherTypes }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null }));

const { OtherTypesFound } = await import("./SearchNoResults");

const flatten = (node: unknown): ReactElement[] => {
  if (!isValidElement(node)) return Array.isArray(node) ? node.flatMap(flatten) : [];
  return [node, ...flatten((node.props as { children?: unknown }).children)];
};
const named = (tree: ReactElement[], name: string) => tree.filter((el) => (el.type as { name?: string }).name === name);

describe("OtherTypesFound (redesign-search-phase3)", () => {
  it("una tarjeta por tipo con coincidencias locales y, debajo, los accesos simples", async () => {
    mocks.findInAllOtherTypes.mockResolvedValue([{ type: "song", rows: [{ key: "k", title: "Kid A Mnesia", query: "kid a mnesia" }] }]);
    const tree = flatten(await OtherTypesFound({ query: "kid a mnesia", type: "album" }));
    expect(mocks.findInAllOtherTypes).toHaveBeenCalledWith("album", "kid a mnesia");
    expect(named(tree, "OtherTypeRows")).toHaveLength(1);
    expect(named(tree, "SearchTypeSwitch")).toHaveLength(1);
  });

  it("sin coincidencias locales, solo los accesos simples", async () => {
    mocks.findInAllOtherTypes.mockResolvedValue([]);
    const tree = flatten(await OtherTypesFound({ query: "qzxvbnmqk", type: "album" }));
    expect(named(tree, "OtherTypeRows")).toHaveLength(0);
    expect(named(tree, "SearchTypeSwitch")).toHaveLength(1);
  });
});
