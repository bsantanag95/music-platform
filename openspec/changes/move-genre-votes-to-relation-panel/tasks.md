## 1. Interfaz

- [x] 1.1 `GenreVotePanel`: quitar el botón y el marco propios (queda el contenido), agregar la prop `interacted` y ponerla en la clave de la consulta
- [x] 1.2 `AlbumRelationPanel`: fila "Géneros" con "Votar géneros" / "Cerrar" que despliega `GenreVotePanel` (con `interacted` calculado de valoración, escuchas y colección)
- [x] 1.3 Layout del álbum: dejar de montar `GenreVotePanel` junto a los chips
- [x] 1.4 Mensajes es/en (`catalog.album.relation`) y retirar las claves que dejan de usarse (`votes.open`, `votes.close`)

## 2. Pruebas y verificación

- [x] 2.1 Pruebas de `GenreVotePanel` (sin botón; recarga al cambiar `interacted`) y de `AlbumRelationPanel` (fila, apertura, `interacted`); ajustar la del layout
- [x] 2.2 Verificar en el navegador (escritorio y móvil): fila en "Tu relación", valorar con el panel abierto habilita los controles, cabecera sin botón
- [x] 2.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` en verde

## 3. Documentación

- [x] 3.1 Actualizar `docs/05-features/genres.md` (ubicación del panel de votos)
