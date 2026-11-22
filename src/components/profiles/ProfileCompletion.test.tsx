import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { COMPLETION_HIDDEN_KEY, ProfileCompletion, type CompletionPart, type CompletionKey } from "./ProfileCompletion";

const openEditor = vi.fn();
let ownerEdit: { openEditor: typeof openEditor } | null = { openEditor };

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${JSON.stringify(values)}` : key,
}));
vi.mock("./OwnerEditProvider", () => ({ useOwnerEdit: () => ownerEdit }));

const KEYS: CompletionKey[] = ["photo", "bio", "identityCard", "ficha", "showcase", "prompts", "links"];

function parts(missing: CompletionKey[]): CompletionPart[] {
  return KEYS.map((key) => ({
    key,
    done: !missing.includes(key),
    panel: { title: `panel-${key}`, editor: <p>editor-{key}</p> },
  }));
}

// Almacenamiento en memoria: el de jsdom de este entorno no es completo.
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  } as unknown as Storage;
}

beforeEach(() => {
  openEditor.mockClear();
  ownerEdit = { openEditor };
  Object.defineProperty(window, "localStorage", { configurable: true, value: memoryStorage() });
});

describe("ProfileCompletion", () => {
  it("cuenta lo completo y muestra lo pendiente como acción", async () => {
    render(<ProfileCompletion parts={parts(["prompts", "links"])} />);
    expect(await screen.findByText('completion.title {"done":5,"total":7}')).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "5");
    expect(screen.getByRole("button", { name: "completion.part.prompts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "completion.part.links" })).toBeInTheDocument();
    // Lo completo no es interactivo.
    expect(screen.queryByRole("button", { name: /completion\.part\.bio/ })).not.toBeInTheDocument();
    expect(screen.getByText("completion.part.bio")).toBeInTheDocument();
  });

  it("una parte pendiente abre el panel de su bloque", async () => {
    const user = userEvent.setup();
    render(<ProfileCompletion parts={parts(["links"])} />);
    const button = await screen.findByRole("button", { name: "completion.part.links" });
    await user.click(button);
    expect(openEditor).toHaveBeenCalledWith(
      expect.objectContaining({ title: "panel-links", trigger: button }),
    );
  });

  it("con las siete completas no se dibuja", () => {
    const { container } = render(<ProfileCompletion parts={parts([])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("«Ocultar» la esconde y lo recuerda en este dispositivo", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ProfileCompletion parts={parts(["bio"])} />);
    await user.click(await screen.findByRole("button", { name: "completion.hide" }));
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(COMPLETION_HIDDEN_KEY)).toBe("1");
    unmount();

    const { container } = render(<ProfileCompletion parts={parts(["bio"])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("fuera del modo del dueño (sin proveedor) no se dibuja", () => {
    ownerEdit = null;
    const { container } = render(<ProfileCompletion parts={parts(["bio"])} />);
    expect(container).toBeEmptyDOMElement();
  });
});
