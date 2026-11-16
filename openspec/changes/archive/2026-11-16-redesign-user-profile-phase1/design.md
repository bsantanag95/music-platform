## Context

Hoy `/[locale]/users/[username]` compone, para visitante autorizado y dueño, dos columnas: una barra lateral pegajosa (`Placa` con
`ProfileIdentity`, `ProfileFicha`, `MutualFollowersRow`, `FollowButton`, `BlockButton` y moderación; `ShareAction`; `SettingsCardSection`
para el dueño; `AffinitySection`; `RecencySection`) y una columna principal con la Tarjeta de Identidad y 12 secciones en `<Suspense>`.
El dueño suma `OwnerProfileBar`, `EditableBlock` por bloque y `?preview=1`. El perfil privado sin acceso usa `PrivateProfileCard` aparte.

Referencia visual: `mockups/profile-2026-11/d2-personalidad.html` (y la auditoría en `index.html`). Decisiones del usuario (2026-11-15):
D2 como base; pestañas = anclas en el perfil; tono calculado al guardar el álbum definitorio (Fase 3); mismos colores y tipografías; sin
numeración de secciones, sin subtítulos, títulos neutros («Artistas seguidos»); el giro del avatar queda fuera.

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `redesign-user-profile-phase1` (este) | Cabecera con «Identidad musical», barra de anclas, sin columna lateral, franja ficha · huella · artistas seguidos; arreglos de Tarjeta a 390 px, foto del artista y avatar. |
| 2 | `redesign-user-profile-phase2` | Cuerpo: «Empieza por aquí» compacto sin repetir la identidad y «Valoraciones destacadas» en la misma fila; Reseñas \| Diario (diario como tabla, sin desplazamiento interno); Favoritos a lo ancho (portadas + artista y canciones al lado); Listas y recorridos \| Colección física (vista previa sin selector de vistas); «En rotación» tras la franja; sin enlaces de Nivel 3 repetidos; «Guardar»/«Seguir mi progreso» ocultos a visitantes sin sesión; títulos sin subtítulos. |
| 3 | `redesign-user-profile-phase3` | Personalidad: tono por perfil (dominante de la carátula del álbum definitorio, calculado con `sharp` al guardarlo, migración nueva + script de relleno, regla de contraste y caída al ámbar) aplicado a la línea de la cabecera, comillas de la bio, pestaña activa y etiqueta del vinilo; vinilo que asoma del álbum y del himno al pasar el cursor (quieto en táctil, sin animación con movimiento reducido). |

## Goals / Non-Goals

**Goals:** primer viewport que presente a la persona; contenido a todo el ancho; cero desbordes a 390 px; las capas del dueño intactas.

**Non-Goals:** cuerpo (Fase 2), personalidad (Fase 3), perfil privado sin acceso, páginas de Nivel 3, datos o API nuevos.

## Decisions

### Componentes nuevos, la Placa se desarma
`ProfileHeader` (server) compone `ProfileIdentity` (variante grande), la bio como cita, los enlaces como íconos, `FollowButton`,
`ShareAction`, `BlockButton`/moderación (en una fila discreta debajo, siempre a la vista), recuentos, `MutualFollowersRow`, la
afinidad compacta (`ProfileAffinity compact`, en una línea) y la recencia; a la derecha `IdentityCard`, rediseñada para la cabecera
(ya no tiene otro uso). `IdentityStrip` compone `ProfileFicha`, `FingerprintSummary` y `ExploreSection`, rediseñados para la franja.
`Placa` no tenía otro uso: se renombró a `ProfileHeader` (con su test) y el perfil privado sigue con `PrivateProfileCard`. Las
ranuras (`identity`, `share`, `extras`, `backdrop`) llegan como nodos con su propio `<Suspense>`. *Alternativa descartada:* mantener `Placa` y moverla arriba: mezclaba ficha y acciones en una
caja estrecha, que es lo que la auditoría señaló.

### Fondo de la cabecera
Carátula del álbum definitorio (miniatura del espejo, ≤250 px) como `background-image` con `blur` y degradado a la tinta; decorativa
(`aria-hidden`). Sin álbum, fondo neutro. No se pide ninguna imagen nueva.

### Anclas fijas
`ProfileAnchors` (client, mínimo): enlaces `#perfil` (Resumen), `#diario`, `#resenas`, `#favoritos`, `#listas`, `#coleccion` con sus
recuentos, calculados por `AnchorsSection` con las consultas de una fila del diario y las listas y las previsualizaciones de favoritos,
colección y reseñas (`getFavoritesPreview` y `getCollectionPreview` pasan a `cache()` para no repetir la consulta de sus estantes; el
bloque de enlaces al final se retira en la Fase 2). Marca el ancla activa por la posición de cada sección al desplazarse, como
`StickyJumpNav`, buscándolas en cada cálculo porque llegan en streaming después de montar la barra; sin JS funcionan como enlaces
normales. `scroll-margin-top` con `--site-header-h` + `--profile-anchors-h` en las secciones ancladas.

### Huella con su década destacada
`getTasteFingerprint` ya calcula `decades`; `FingerprintSummary variant="strip"` muestra la etiqueta de la década predominante en grande y
las frases del resumen debajo, sin cifras (spec `taste-fingerprint`).

### Capas del dueño
`OwnerProfileBar` encima de la cabecera. La tarjeta de Ajustes se queda (spec `social-profiles`, "Panel del dueño": muestra las
solicitudes pendientes) y pasa a la columna de datos de la cabecera. `EditableBlock` envuelve solo esa columna (`wrapDetails`, editor de
la Placa sin cambios, que también edita la ficha de la franja) y la Tarjeta de Identidad conserva su propio lápiz; así no se pisan los
dos lápices. `?preview=1` compone la misma estructura.

### Arreglos
`IdentityCard`: columnas con `min-w-0` y títulos en `line-clamp-2`, acotada a 32,5 rem para tableta; usa la foto del artista
definitorio (la misma fuente que `ExploreSection`: `artist.photoUrl` con su verificación de licencia), que `getShowcase` devuelve como
`coverThumbUrl` del artista. La afinidad compacta usa también las fotos de los artistas en común. `UserAvatar`: `onError` cae al monograma (spec `profile-identity`,
«Imagen de identidad por monograma»).

## Risks / Trade-offs

- [Cabecera alta en móvil] → En `<sm` la identidad musical va debajo de los datos, en tres columnas pequeñas; acciones en una fila.
- [Reubicar acciones de moderación] → Mismas acciones y permisos; tests de Placa trasladados a `ProfileHeader`.
- [Cuerpo aún sin rediseñar] → A todo el ancho en Fase 1; verificar a 1440 px que ningún estante quede estirado de forma rara.

## Migration Plan

Sin datos ni API; revertir el commit restaura la composición anterior.

## Open Questions

- Resuelta al implementar: bloquear, reportar y suspender quedan a la vista en una fila discreta bajo los datos (son enlaces de texto
  cortos y sus formularios se despliegan debajo); no hace falta un menú «⋯».
