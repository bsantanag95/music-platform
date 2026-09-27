import { describe, expect, it } from "vitest";
import { isAssistant, orderSound, splitMembers } from "./song-credits";
import type { TrackCreditPerson } from "@/services/catalog/personnel-levels";

function person(name: string, ...roles: [string, string[]?][]): TrackCreditPerson {
  return {
    artistId: name.toLowerCase(),
    name,
    creditedAs: null,
    roles: roles.map(([relationType, attributes = []]) => ({ relationType, attributes })),
  };
}

describe("splitMembers", () => {
  it("separa integrantes e invitados conservando el orden", () => {
    const people = [person("Amy"), person("Sabrina"), person("Bobby")];
    const { members, guests } = splitMembers(people, new Set(["sabrina"]));
    expect(members.map((p) => p.name)).toEqual(["Sabrina"]);
    expect(guests.map((p) => p.name)).toEqual(["Amy", "Bobby"]);
  });
});

describe("orderSound", () => {
  it("ordena por rol principal y deja los asistentes aparte", () => {
    const { main, assistants } = orderSound([
      person("Laura Sisk", ["recording"]),
      person("Serban Ghenea", ["mix"]),
      person("Joey Miller", ["engineer", ["assistant"]]),
      person("Jack Antonoff", ["programming"], ["recording"]),
      person("Bryce Bordone", ["mix"]),
      person("Kellie McGrew", ["engineer", ["assistant"]]),
    ]);
    expect(main.map((p) => p.name)).toEqual(["Bryce Bordone", "Serban Ghenea", "Jack Antonoff", "Laura Sisk"]);
    expect(assistants.map((p) => p.name)).toEqual(["Joey Miller", "Kellie McGrew"]);
  });

  it("quien asiste y además graba no es asistente", () => {
    const both = person("Jack Manning", ["recording"], ["recording", ["assistant"]]);
    expect(isAssistant(both)).toBe(false);
    expect(orderSound([both]).main).toHaveLength(1);
  });
});
