## Decisiones

**D1 — La región `status` no se desmonta.** Los lectores de pantalla anuncian los cambios de una región `aria-live` que ya existe; si se montara solo al haber texto, el primer mensaje se perdería. Se conserva siempre montada y se le quita la altura mínima: vacía ocupa 0.

**D2 — La lista de resultados solo existe con resultados.** Una `<ul>` vacía con `max-h` no ocupa alto, pero sí cuenta como hijo del contenedor flex y suma su separación. Se renderiza condicionalmente en los cuatro pickers.

**D3 — Margen negativo en «Cambiar».** La zona táctil de 44 px se mantiene (`min-h-11`) pero con `-my-3.5` en móvil para que la línea de texto no crezca a 44 px; en escritorio vuelve a su tamaño normal.

**D4 — Resumen: una acción, una lista.** Las filas con flecha reutilizan el chevron de la tarjeta «Última vez» de Inicio. «Ir a Inicio» es el único `<button>`; las salidas secundarias son enlaces en un `<nav aria-label="También puedes">`. El orden pone primero lo personal que aún no hizo (géneros, valorar) y después lo de descubrimiento (Explorar, Buscar gente).

## Medición (375 px, scratch, 2026-10-10)

| | Antes (estimado en capturas) | Después (medido en el DOM) |
|---|---|---|
| Hueco entre el campo y la nota, paso 1 | ~50–70 px | 24 px |
| Paso 2 / 3 / 4 | ~50–70 px | 24 / 32 / 24 px |
| Listas vacías en el DOM de un paso sin búsqueda | 1 por paso | 0 |
| Resumen: botones | 5 en 3 filas | 1 + lista de 4 enlaces |
