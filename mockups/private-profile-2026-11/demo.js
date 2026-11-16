// Barra de la demo: cambia el estado de quien mira (no es parte del diseño).
// Cada elemento con `data-only="estado1 estado2"` se oculta (atributo `hidden`) cuando
// el estado actual no está en su lista. El estado inicial sale del hash.
(function () {
  const buttons = [...document.querySelectorAll(".mock-bar [data-set]")];
  const scoped = [...document.querySelectorAll("[data-only]")];
  function set(state) {
    document.body.dataset.state = state;
    scoped.forEach((el) => {
      el.hidden = !el.dataset.only.split(/\s+/).includes(state);
    });
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === state)));
    history.replaceState(null, "", "#" + state);
  }
  buttons.forEach((b) => b.addEventListener("click", () => set(b.dataset.set)));
  const initial = location.hash.slice(1);
  set(buttons.some((b) => b.dataset.set === initial) ? initial : "anon");
})();
