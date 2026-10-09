## Decisiones

**D1 — Un solo motor de búsqueda.** `TargetPicker` tenía las dos fases (local 150 ms, completa 500 ms, aborto al cambiar el texto) dentro del componente. Se extrae tal cual a `src/components/quick-actions/use-target-search.ts` y se usa desde `TargetPicker` y desde los dos pickers del onboarding. `useCatalogSearch` (una sola fase, sin cancelación, `failed` ignorado) se elimina. Las 74 pruebas de `quick-actions` siguen verdes sin tocar.

**D2 — `category=studio` solo en la búsqueda completa de la Puerta 1.** Medido sobre scratch: «dark side of the moon» sin filtro no traía a Pink Floyd entre 33 resultados; con `category=studio` aparece en el 4.º puesto de la búsqueda completa. Las sugerencias locales no se filtran (llegan sin categoría) y conservan su lugar. Las filas de categoría distinta de estudio rotulan su tipo.

**D3 — Lo registrado sale de los resultados.** En lugar de dejar el botón activo, la Puerta 2 quita de la lista lo ya registrado y lo muestra en una lista propia con «Deshacer» (`DELETE /api/me/diary/{id}`, ya existente). Es el mismo patrón que la Puerta 1 (lo elegido sale de los resultados). Una guarda en un `useRef` cubre el doble clic que llega antes del siguiente render.

**D4 — Aviso de email compacto, en el mismo lugar.** El spec vigente pide el aviso antes de las dos puertas; se conserva la posición y se reduce su peso (258 → 154 px en móvil, botón secundario) en vez de moverlo.

**D5 — Foco tras elegir.** Al elegir un álbum se limpia el texto y se devuelve el foco al campo: el resultado elegido desaparece del DOM y el foco caía al `<body>`.

## Medición (scratch, 2026-10-09)

| | Antes | Después |
|---|---|---|
| Primer campo de búsqueda en móvil (375×812) | y = 800 | y = 696 |
| Aviso de email en móvil | 258 px | 154 px |
| `role="status"` en la página | 26 | 4 |
| Tamaño de fuente de los inputs | 14 px | 16 px (móvil) |
| Alto de «Saltar por ahora» | 20 px | 44 px |
| Entradas de diario tras 2 clics seguidos en un resultado | 2–3 | 1 |
