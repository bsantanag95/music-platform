## Why

Votar los géneros de un álbum es una acción personal sobre el álbum, igual que valorar, registrar una escucha o coleccionar, y el permiso para votar depende justo de esas acciones. Hoy el botón "Votar géneros" está junto a los chips de la cabecera (una zona informativa) y su panel no se entera de que la persona acaba de valorar: queda bloqueado hasta reabrirlo.

## What Changes

- El control de votación pasa de la cabecera al panel **"Tu relación"**: una fila "Géneros" con el botón "Votar géneros" que despliega el panel de ▲/▼ y propuestas dentro del propio panel, como ya hacen Colección y Listas.
- La cabecera conserva solo los chips de géneros (informativos) y los descriptores.
- El acceso a votar se recalcula con el estado del panel (valoración, escuchas, colección): al valorar o registrar una escucha, el panel de votos se habilita sin cerrarlo ni recargar.
- Los visitantes sin sesión ya ven el aviso de iniciar sesión de "Tu relación"; no hay fila de géneros para ellos.
- Sin cambios en la API, los votos, el puntaje ni los datos.

## Capabilities

### New Capabilities

### Modified Capabilities
- `genre-vote-panel`: el requisito "Panel de votación en el álbum" cambia de ubicación (panel "Tu relación" en lugar de la cabecera) y se actualiza solo al cambiar la interacción.

## Impact

- UI: `AlbumRelationPanel` (fila nueva), `GenreVotePanel` (sin botón propio; recibe `interacted`), layout del álbum (deja de montarlo), mensajes es/en.
- Docs: `05-features/genres.md`, `contracts.md` no cambia.
- Sin migraciones ni dependencias.
