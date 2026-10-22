## Context

Fase 3 de la auditoría de `/me/favorites`. Cada renderer (Detallada, Índice, Gráfico) escribe su propio `select` de
audiencia y su botón "Quitar favorito"; quitar es optimista y definitivo (`DELETE` inmediato); el modo selección tiene
casillas de 16 px y una barra con tres botones de audiencia. El muro se comparte con el perfil público (`readOnly`),
que no muestra ninguno de esos controles. `POST /api/me/favorites` ya acepta `audience` al crear.

## Goals / Non-Goals

**Goals:** audiencia visible sin ruido, menú único de acciones, quitar reversible, tres vistas ordenadas, selección cómoda.
**Non-Goals:** API/datos nuevos, foto de artista, rediseño del perfil público.

## Decisions

**D1. Un componente `FavoriteActions` (insignia + `⋯` + menú) compartido por las tres vistas.** Hoy el select y el
botón se escriben tres veces. La insignia (icono + nombre de la audiencia) y el botón `⋯` abren el mismo menú
(`role="menu"`): tres `menuitemradio` de audiencia y un `menuitem` "Quitar favorito". El disparador lleva
`aria-haspopup="menu"` y `aria-expanded`; el menú se cierra con Escape, con un clic fuera o al elegir, y devuelve el
foco al disparador. No se agrega ninguna librería. Alternativa descartada: conservar el `select` con aspecto de
insignia — no resuelve dónde poner "Quitar" y mantiene un control por ficha visible a la vez.

**D2. Quitar con "Deshacer" re-creando con `POST { target, audience }`.** La alternativa de retrasar el `DELETE` hasta
que expire el aviso pierde datos si se cierra la pestaña antes; re-crear es robusto y usa un endpoint existente. El
costo es que la fecha de marcado se reinicia al deshacer (se documenta). `POST` es un toggle: el aviso se limpia al
primer uso para que no se pueda alternar dos veces por error. Un nuevo `addFavorite(target, audience)` en el cliente
de la API usa el cuerpo con `audience`. El aviso dura 6 s y se anuncia ("Favorito quitado").

**D3. Quitar en lote con confirmación y sin deshacer.** No hay `DELETE` en lote; se hacen `DELETE` por favorito con
`Promise.allSettled` y, si alguno falla, se restaura la caché y se muestra el aviso global. Como el deshacer de N
elementos complica el estado, se exige una confirmación en la barra ("¿Quitar N favoritos? Quitar / Cancelar").

**D4. Gráfico limpio.** La ficha queda: portada (o placa/disco), una marca de icono sobre la portada solo si la
audiencia no es pública, y debajo título, artista y el `⋯`. La insignia con texto no va en la ficha de ~110 px; la
audiencia exacta está en el menú y en la etiqueta accesible del `⋯`.

**D5. Índice como `<table>`.** Es un dato tabular (título, fecha, audiencia, acciones) y alinea las columnas sin
números mágicos. Encabezados `<th scope="col">` visibles desde `sm`, solo para lectores de pantalla debajo (como en
valoraciones); la fecha se oculta bajo `sm`. Título con celda `max-w-0` para truncar.

**D6. Modo selección.** Casillas de 24 px siempre (antes 16, 24 solo en táctil), ficha o fila seleccionada con borde
y fondo de acento, y un botón "Seleccionar todo" en el encabezado de cada sección (alterna entre seleccionar y
quitar la selección de esa sección). La barra pasa a 44 px en táctil y suma "Quitar" con confirmación en línea.

**D7. Modo lectura intacto.** `FavoriteActions` no se renderiza con `readOnly`; Índice (tabla) y Gráfico limpio sí
aplican al perfil público sin columnas de audiencia ni acciones.

## Risks / Trade-offs

- [Re-crear al deshacer reinicia la fecha] → Se documenta; es preferible a perder el favorito si se cierra la pestaña.
- [Menú propio: accesibilidad y foco] → Se prueba apertura, Escape, clic fuera, foco de vuelta, roles y teclado.
- [Quitar en lote parcial] → `allSettled` y restauración completa de la caché ante cualquier fallo, con aviso.
- [Cambiar tres renderers a la vez] → Cada uno conserva sus pruebas; el perfil público se verifica en el navegador.

## Migration Plan

Solo front-end y un helper del cliente de la API; sin migraciones. Revertir es revertir el commit.
