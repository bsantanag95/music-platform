## Why

Con datos reales ("Manchild", Sabrina Carpenter) la cabecera de la canción recién rediseñada
(`redesign-song-page`) muestra ruido y datos confusos: la línea de escuchas se corta con un "·"
suelto, el puntaje detallado "88" no dice de qué es, tres tarjetas de comunidad vacías ocupan
tanto como la ficha técnica y "Pocas valoraciones" esconde la cantidad real, "(música, letra)"
se repite con cada autor y otra vez en el bloque Composición, el disco principal aparece tres
veces seguidas, "Primera aparición: Manchild" parece apuntar a la propia canción, la carátula
del álbum no enlaza al álbum y el botón Favorita de ancho completo rompe el ritmo del panel.

## What Changes

Primera tanda (arreglos):
1. **Escuchas en dos líneas fijas** en el panel: arriba "Escuchas" y "+ Registrar escucha";
   abajo "N · última: reacción, fecha" y "Ver en tu diario →", sin separadores sueltos.
2. **Puntaje detallado con escala**: "88/100" en el panel de la canción y en el del álbum.
3. **Comunidad sin cajas vacías**: si no hay media, reacción predominante ni favoritas, el
   bloque es una sola línea con las cantidades que existen ("Todavía hay poca actividad de la
   comunidad · 1 valoración"); con datos, las tarjetas muestran siempre la cantidad (nunca
   "Pocas valoraciones") y "—" en lugar de "0".
4. **Autoría sin repetición**: la ficha muestra solo los nombres; el bloque Composición, con
   los roles, aparece solo cuando agrega algo (roles distintos entre autores).

Segunda tanda (mejoras):
5. **Antetítulo sin el disco**: "Canción · Pista 1"; el disco queda en las migas y en la tira.
6. **Tipo del disco en "Primera aparición"** cuando no es el disco principal: "Manchild
   (single) · 2025".
7. **Carátula enlazada** al disco principal, con su título como ayuda.
8. **Favorita como fila compacta** del panel (etiqueta a la izquierda, conmutador a la
   derecha), como las demás filas.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `song-personal-panel`: historial en dos líneas, puntaje detallado con escala, Favorita como
  fila.
- `song-community-stats`: bloque compacto sin datos suficientes; cantidades siempre visibles.
- `catalog-song`: roles de autoría solo cuando difieren.
- `song-page-layout`: antetítulo sin disco, tipo de disco en primera aparición, carátula
  enlazada, Composición solo cuando agrega información.

## Impact

- `src/components/song/` (cabecera, panel, créditos), `src/components/catalog/SongwriterNames.tsx`,
  `src/components/album/AlbumRelationPanel.tsx` (solo "N/100"), mensajes `catalog` en `es` y
  `en`, tests de esos componentes y de la página.
- `docs/05-features/catalog-browsing.md` (sección 3b).
- Sin cambios de datos, contratos ni esquema.
