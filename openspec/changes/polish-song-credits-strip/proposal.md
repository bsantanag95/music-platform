## Why

En "Manchild" la tira de pistas y los créditos de la grabación se leen mal: "2 Tears" parece el
título de una canción, la posición de la pista aparece dos veces seguidas (antetítulo y tira),
el bloque de créditos ocupa medio ancho con la otra mitad vacía, los créditos son un párrafo
corrido de nombres y paréntesis, Jack Antonoff lista 9 roles de corrido, los integrantes no se
distinguen de los invitados y Sonido mezcla a quien mezcló con los asistentes en orden
alfabético.

## What Changes

1. **Tira de pistas**: el número de pista separado del título ("2 · Tears") con la etiqueta
   "Anterior" / "Siguiente" encima y un área clicable más grande; en los extremos del disco,
   "Inicio del disco" / "Fin del disco" en lugar de un hueco; el centro dice "*Disco* · 1 de 12".
2. **Antetítulo**: siempre "Canción"; la posición vive solo en la tira.
3. **Créditos a ancho completo**: Composición y créditos apilados; dentro de los créditos,
   Intérpretes en una columna y el resto en otra.
4. **Una persona por fila** en los créditos de la grabación: nombre a la izquierda y roles a la
   derecha, por grupo, como la pestaña Créditos del álbum.
5. **Roles recortados**: los 4 primeros y "+N" para ver el resto (solo con 2 o más ocultos).
6. **Integrantes primero y destacados** entre los intérpretes (tipografía prominente, como los
   integrantes en los créditos del álbum), separados de los invitados.
7. **Sonido por jerarquía**: mezcla, masterización, grabación, ingeniería y programación, en ese
   orden; las asistencias al final, contraídas en "+N asistentes".
8. (Parte de 1) **Tira menos plana**: etiquetas y áreas de clic generosas.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `song-page-layout`: antetítulo, tira de pistas y presentación de los créditos de la
  grabación.

## Impact

- `src/components/song/` (cabecera, tira, créditos), `src/components/album/AlbumCredits.tsx`
  (exporta el formateador de roles), página de canción, mensajes `catalog` `es`/`en`, tests.
- `docs/05-features/catalog-browsing.md` (sección 3b). Sin cambios de datos ni contratos.
