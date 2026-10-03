# Géneros

Cambios `add-genre-taxonomy` (datos) y `show-genres` (superficie). El modelo de datos vive en
`03-data/sql-model.md` (sección "Géneros") y las decisiones en el ADR 0023 y el ADR 0024.

## Dónde se ven

| Superficie | Qué muestra | Fuente |
|---|---|---|
| Cabecera de **artista** | hasta 5 chips de sus géneros semilla y un "+N" desplegable (`<details>`) | `artist_genre_seed` (Wikidata P136) |
| Identidad del **álbum** | hasta 5 chips de géneros efectivos (principal destacado, secundarios y el resto en "+N") y, en una fila aparte sin enlace, los descriptores (Instrumental, Navideña, Orquestal, Banda sonora) | vista `release_group_effective_genre` (semillas + votos) + tipo `Soundtrack` |
| Identidad de la **canción** | los géneros del disco principal, atenuados ("Del álbum") | idem, vía el disco principal |
| `/genre/<slug>` | relaciones, artistas y álbumes del género y sus subgéneros | `genre_relation`, semillas |
| `/explore` | chips por familia (`?familia=`) y listado por género con subgéneros | ver `explore.md` |
| Perfil | "Géneros que me mueven" (ficha de la Placa) y la cresta de la huella con la marca de declarado | `app_user.genres`, ver `user-profile.md` |

Los chips son un único componente (`src/components/genres/GenreChips.tsx`): cada chip enlaza a
`/genre/<slug>`, los **heredados del artista** van atenuados con el texto accesible "Heredado de
{artista}" (en la canción, "Del álbum") y los descriptores nunca enlazan. Una cabecera sin géneros ni
descriptores no deja hueco.

## Página de género

`/{locale}/genre/<slug>` (segmento fijo en inglés, ADR 0007; slug guardado de la taxonomía, ADR 0023):

- Nombre localizado (`genreDisplayName`: en español la etiqueta de Wikidata o la corrección curada; si no, el de
  MusicBrainz) y sus **familias**, que enlazan a `/explore?familia=`.
- **Subgénero de**, **Subgéneros** y **Géneros cercanos** (fusión de, luego influido por; hasta 8, sin repetir
  padres ni subgéneros): solo estilos visibles, cada uno enlaza a su página.
- **Artistas**: hasta 12 con el género o un subgénero entre sus semillas, por álbumes acreditados.
- **Álbumes** del género o de sus subgéneros, paginados por `?page=` con el orden de Explorar.
- Sin música: "Todavía no hay música de este género en el catálogo". Slug desconocido, descriptor u oculto: 404;
  mayúsculas: 308 al canónico.

No hay página de familia propia: la familia es un corte de Explorar.

## Selector de géneros del perfil

"Géneros que me mueven" ya no es una lista cerrada: el editor tiene un buscador sobre los ~2.200 estilos de la
taxonomía (`GET /api/genres/search`, por nombre en español o inglés, sin tildes), con resultados navegables con
teclado, chips quitables y el contador "n de 5". Vacío ofrece los géneros más usados. El servidor valida el formato
del slug y que sea un estilo visible (ADR 0024); un género retirado u oculto se ignora al mostrar sin tocar lo
guardado.

## Declarado frente a real

Si el perfil es accesible y el dueño declaró géneros, la cresta de la huella marca (★ con texto accesible) las
familias que contienen alguno de ellos y nombra aparte las declaradas que no aparecen en lo que valora. Sin géneros
declarados no hay marcas.

## Votos de la comunidad sobre los géneros del álbum

Cambios `add-genre-votes` (ADR 0025) y `move-genre-votes-to-relation-panel`. Votar es una acción personal sobre el
álbum, así que vive en el panel **"Tu relación"** (junto a valorar, escuchar, Colección y Listas), no en la cabecera,
que solo informa: la fila **"Géneros"** tiene el enlace **"Votar géneros"**, que despliega en el propio panel
(`GenreVotePanel`) los géneros del álbum con ▲ / ▼ conmutables (pulsar el voto activo lo retira) y el rango
(Principal / Secundario). Un buscador (el mismo `GET /api/genres/search`) permite **proponer** un género nuevo, que
se vota +1 al elegirlo. Los visitantes sin sesión no ven la fila: "Tu relación" les ofrece iniciar sesión. El panel
recibe `interacted` (valoración, escuchas o colección, según el estado de "Tu relación") en la clave de su consulta:
al valorar, registrar una escucha o agregar el álbum a la colección el acceso se vuelve a pedir sin cerrarlo.

- **Quién vota:** quien valoró, escuchó (diario) o coleccionó ese álbum, con la cuenta activa y sin suspensión social.
  Quien no puede ve los controles desactivados y el motivo; sin sesión, la invitación a iniciar sesión.
- **Puntaje y rangos:** semilla de Wikidata (vale 1) + votos. Los géneros son los de puntaje > 0; el primero es el
  **principal** (chip destacado), los que llegan a la mitad de su puntaje (mínimo 1) son **secundarios** y el resto va al
  "+N". Un −1 neutraliza una semilla; una propuesta aprobada hace que el álbum deje de heredar del artista (el panel
  lo avisa).
- **Privacidad:** el voto individual solo lo ve su autor y no genera actividad. Las cifras (▲ y ▼) se muestran solo con
  al menos 5 votantes distintos.
- **Tope:** 8 géneros votados por persona y álbum. No se votan descriptores ni géneros ocultos.
- **Supervivencia:** el voto sigue contando aunque se quite la valoración, entrada o colección; una cuenta desactivada
  deja de contar mientras lo esté.

Todas las lecturas (Explorar, Caminos, huella, página de género, cabeceras, canción) usan la misma vista de géneros
efectivos, así que reflejan el puntaje sin cambios propios.

## Fuera de alcance

Votos sobre artistas, canciones o descriptores, géneros propios de canción, edición de géneros de un artista o álbum y
búsqueda de géneros en el buscador del encabezado.
