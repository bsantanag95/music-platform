## Decisions

### D1. Grupos como `fieldset`

Cada grupo es un `fieldset` con su `legend` (Identidad, Origen, Época, Lanzamiento) y una grilla de dos columnas desde
`md`. La etiqueta va arriba y la ayuda debajo del control (antes una ayuda arriba y otra abajo desalineaban la fila); en los
rangos, "desde" y "hasta" van en el texto de ejemplo y como etiqueta para lectores de pantalla. La casilla de
coincidencia exacta, debajo de su texto.
El selector de países recibe la clase de los demás campos (`inputClassName` en `SearchablePicker`), así comparte alto,
tamaño y tipografía.

### D2. Cantidad de criterios con la misma regla que la barra

La fila de envío cuenta los criterios con `parseCriteria` + `criterionChips` sobre lo que el formulario enviaría, la misma
regla que la barra de criterios de la Fase 1: un rango cuenta uno; cada país y cada tipo, uno. Se recalcula en cada
`input`, `change` y clic del formulario (las etiquetas de países cambian sin evento de campo). En móvil es `sticky` al
pie; desde `md` vuelve a su lugar.

### D3. Validación propia solo con JavaScript

`validateAdvancedForm(type, values)` es pura (en `filters.ts`) y devuelve, por campo, la clave del error. El formulario
pone `noValidate` solo tras hidratar: sin JavaScript se conservan `pattern` y el globo del navegador, y el servidor sigue
ignorando lo inválido. Con un error, no navega: marca `aria-invalid`, muestra el mensaje bajo el grupo y enfoca el primer
campo con error. Un rango invertido es error en el formulario (antes se intercambiaba en silencio); por URL se sigue
intercambiando.

### D4. Valores ignorados desde la URL

`ignoredParams(type, read, criteria)` compara lo crudo de la URL con lo que `parseCriteria` aceptó, solo en los campos del
tipo, y devuelve `campo=valor` de lo descartado (las banderas de coincidencia exacta sin su campo no se avisan). La página
lo muestra sobre la barra de criterios.

### D5. Ejemplos fijos y recientes en el navegador

Los ejemplos son datos (`advanced-examples.ts`: título traducido + criterios) y su subtítulo se arma con las etiquetas de
la barra, así no se desincronizan. Las recientes guardan el `href` de cada búsqueda avanzada mostrada (máximo 5, sin
repetir), con la misma protección de `localStorage` que las recientes de `/search`; un componente cliente la registra al
mostrar resultados, así cuentan también las búsquedas hechas desde una pastilla o un enlace.
