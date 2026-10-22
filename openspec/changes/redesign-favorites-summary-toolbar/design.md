## Context

Fase 2 de la auditoría de `/me/favorites`. La barra tiene tres `FilterSelect` (tipo, audiencia, orden) sin
cantidades. `counts` ya es una faceta por tipo (respeta `q` y `audience`, ignora `type`); no existe nada
equivalente para la audiencia. El muro se comparte con el perfil público (`readOnly`), donde no hay filtro de
audiencia. El servicio ya hace dos consultas (lista, conteo por tipo) y sus pruebas simulan la cadena de Drizzle.

## Goals / Non-Goals

**Goals:** segmentos de tipo y fichas de audiencia con cantidad; facetas correctas con una consulta; facetas al día
tras editar; sin tocar el modo lectura.
**Non-Goals:** rediseño de fichas y del modo selección (Fase 3), faceta en el perfil público.

## Decisions

**D1. Segmentos de tipo con `counts`, sin API nueva.** `counts` ya ignora el filtro de tipo y respeta búsqueda y
audiencia, que es exactamente lo que necesitan los segmentos. "Todo" es la suma. Mismo patrón y accesibilidad que
`RatingsTypeSegments` (botones con `aria-pressed`; el activo no se desactiva, se elige "Todo").

**D2. `facets.audience` con una consulta agrupada.** `SELECT audience, count(*) … GROUP BY audience` con el alcance
(`userId`, `q`, `type`) pero **sin** `audience`, después de las dos existentes (así las pruebas del servicio suman un
doble). Alternativa descartada: derivarla en el cliente de la página cargada (solo tendría la primera página). Solo
`listMyFavorites` la calcula; el campo `facets` es opcional en el esquema porque la lectura del perfil público no lo
lleva (el visitante no filtra por audiencia).

**D3. Fichas de audiencia que alternan.** Un filtro de audiencia se activa y se quita tocando la misma ficha
(`aria-pressed`), a diferencia del tipo (donde "Todo" es una opción). Es lo que mostró la maqueta aprobada y evita
una cuarta ficha "Todas". Tres botones con icono de texto no; solo texto y cantidad, para no introducir iconos antes
de la Fase 3.

**D4. Ajuste local de facetas.** Igual que `adjustFacets` en valoraciones: `adjustFavoriteFacets` en
`favorites-shared.tsx` es pura. Cambiar la audiencia de N favoritos mueve N del cubo viejo al nuevo; quitar uno resta
de su cubo de audiencia y de su tipo en `counts`. Si hay filtro de audiencia, la ficha editada sigue en su lugar (la
lista no se reordena) pero sus cubos se ajustan. Estado local `facets`, reemplazado por la respuesta del servidor en
cada consulta.

**D5. Barra: buscador + segmentos en la primera fila, fichas, orden y limpiar en la segunda.** Los selectores de tipo
y audiencia desaparecen; el orden conserva su `FilterSelect`. En modo lectura no se muestran las fichas de audiencia
(como hoy no se muestra el selector).

## Risks / Trade-offs

- [Más trabajo por petición] → Una consulta agrupada por usuario (decenas de filas) con los mismos joins.
- [Las facetas locales pueden divergir tras muchas ediciones] → Un recargado o cambio de filtro pide los valores
  reales; el ajuste cubre los tres movimientos posibles y se prueba con una función pura.
- [Se retira el selector de audiencia de la barra] → Las fichas son botones nativos con `aria-pressed` y etiqueta;
  `aria-label` del grupo conserva "Filtrar por audiencia" para lectores de pantalla y pruebas.

## Migration Plan

Campo aditivo en la API; sin migraciones. Revertir es revertir el commit.
