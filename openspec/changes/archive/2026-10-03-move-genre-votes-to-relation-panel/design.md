## Context

`GenreVotePanel` (cambio `add-genre-votes`) es un componente cliente con su propio botón que se monta en la cabecera del álbum y pide `GET /api/catalog/release-group/{id}/genre-votes` al abrirse. `AlbumRelationPanel` ya contiene el estado de la persona sobre el álbum: valoración, escuchas, colección, favorito, listas.

## Goals / Non-Goals

**Goals:** ubicar el voto con las demás acciones personales; que el panel de votos refleje al instante cambios de valoración, escuchas o colección.

**Non-Goals:** cambiar la API, las reglas de voto o los chips informativos.

## Decisions

1. **Fila "Géneros" en "Tu relación"**, en el bloque de Colección y Listas, con el mismo patrón de las otras: etiqueta a la izquierda, enlace "Votar géneros" / "Cerrar" a la derecha y contenido desplegado debajo. El estado abierto vive en `AlbumRelationPanel`.
2. **`GenreVotePanel` pasa a ser solo el contenido**: sin botón ni marco propio (siempre se monta ya abierto) y con la prop `interacted: boolean`. *Alternativa descartada:* dejar el botón dentro del componente y montarlo en el panel, porque duplicaría el patrón de filas del panel.
3. **`interacted` entra en la clave de la consulta** (`[..., interacted]`): cuando la persona valora, registra una escucha o agrega a su colección, la clave cambia y el panel vuelve a pedir su acceso. `interacted = valoración propia || escuchas > 0 || entradas de colección > 0` (las de búsqueda no cuentan, igual que en el servidor). El servidor sigue siendo quien decide.
4. **Sin sesión:** no se muestra la fila; "Tu relación" ya invita a iniciar sesión.

## Risks / Trade-offs

- [El cálculo local de `interacted` podría divergir del servidor] → solo se usa para refrescar la consulta; el acceso real lo devuelve la API y el servidor lo revalida al votar.
- [El panel de 18 rem es estrecho para la lista de géneros] → la lista usa el ancho completo del contenedor y se verifica en móvil y escritorio.
