## 1. Marco y pestañas

- [x] 1.1 `page.tsx` y `loading.tsx`: marco `max-w-[88rem]` con los márgenes del sitio; título de página en la escala de Explorar y Listas; la tarjeta del formulario conserva su ancho de lectura
- [x] 1.2 Pestañas en pastillas, como `SearchTypeTabs` de `/search` (pieza común o la misma clase), con `aria-current="page"`

## 2. Pastillas

- [x] 2.1 Componente de pastillas de radio (`fieldset` + `legend`, radios `sr-only` dentro de su `label`, `has-[:checked]` y `has-[:focus-visible]`), con «Cualquiera» = `value=""` (con JS se omite; sin JS llega vacío y el servidor lo ignora)
- [x] 2.2 Tipo de artista (Cualquiera · Grupo · Solista · Otras personas) y Estado (Cualquiera · En actividad · Ya no en actividad) con pastillas; la etiqueta del año sigue al tipo (`onChange` del grupo); la ayuda de Otras personas se conserva
- [x] 2.3 Tipo de lanzamiento (Álbumes y Canciones) como casillas con forma de pastilla, mismo `name="category"`
- [x] 2.4 Recuento de criterios y `formParams` sin cambios de comportamiento (radios vacíos no suman ni envían)

## 3. Catálogo y tamaños

- [x] 3.1 Leyenda «Del catálogo» con la etiqueta «solo lo ya cargado» (petróleo, 12 px) y la ayuda en texto de 14 px (es/en)
- [x] 3.2 Ayudas, contadores, leyendas y ejemplos a 12 px como mínimo

## 4. Tests, documentación y verificación

- [x] 4.1 `AdvancedSearchForm.test.tsx`: radios por nombre accesible, etiqueta del año al elegir Grupo, «Cualquiera» sin parámetro, categorías múltiples, recuento
- [x] 4.2 `pnpm run i18n:client-messages` si cambian textos de cliente
- [x] 4.3 `docs/05-features/catalog-browsing.md`: marco, pastillas, etiqueta del catálogo y plan de las fases 2 y 3
- [x] 4.4 `pnpm run verify` y `pnpm run build`
- [x] 4.5 Navegador a 1440, 1024, 820 y 390 px en las tres pestañas, con y sin búsqueda; teclado en las pastillas; envío sin JavaScript (formulario GET)
