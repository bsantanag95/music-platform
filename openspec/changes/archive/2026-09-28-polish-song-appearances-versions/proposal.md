## Why

En "Manchild" las secciones "Esta grabación aparece en" y "Otras versiones de la canción" se
leen mal: las columnas quedan desparejas (Recopilaciones cae abajo a la izquierda con un hueco a
la derecha), la marca "original" se confunde con la versión original de la obra, el año solo no
distingue el single del álbum del mismo año, cada versión repite "Manchild" dos veces, las
etiquetas "original" e "Instrumental" parecen de sistemas distintos, las filas de versiones se
estiran a todo el ancho y, con un solo grupo, el título de la sección y el del grupo se repiten.
Además, en los créditos, "+3 asistentes" no cambia al desplegarse y el "+N" de roles no se
puede volver a contraer.

## What Changes

0. **Créditos**: desplegados, los asistentes muestran "Ocultar asistentes"; los roles de una
   persona muestran "ocultar" al final y se pueden volver a contraer.
1. **Apariciones en dos columnas por origen**: discos del artista (estudio, singles y EP, en vivo
   y otros) a la izquierda y Recopilaciones a la derecha cuando hay de los dos.
2. **"Primer lanzamiento"** en lugar de "original", con la fecha completa como tooltip.
3. **Mes y año** del disco cuando la fecha lo tiene.
4. **Estilo parejo**: sin filetes entre discos y sin "· 1" en grupos de un disco.
5. **Versiones abiertas si son pocas**: un grupo con hasta 5 versiones, o el único grupo, se
   muestra desplegado.
6. **Menos repetición**: el artista es la línea principal; el título solo si difiere del de la
   canción; el disco sin su nombre cuando se llama igual que la canción.
7. **Etiquetas unificadas**: misma forma y capitalización; ámbar solo en "Primer lanzamiento".
8. **Versiones en dos columnas** desde pantallas anchas.
9. **Un solo grupo sin acordeón**: su nombre queda como subtítulo de la sección, con "+N más" si
   supera 10 versiones.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `song-versions`: presentación de los discos que contienen la grabación y de las otras
  versiones.
- `song-page-layout`: contracción de asistentes y roles en los créditos de la grabación.

## Impact

- `src/components/song/` (apariciones, versiones, créditos), `VersionAttributeTags`, página de
  canción, mensajes `catalog` `es`/`en`, tests.
- `docs/05-features/catalog-browsing.md` (sección 3b). Sin cambios de datos ni contratos.
