## 1. Cabecera

- [x] 1.1 `ProfileHeader`: avatar, nombre como `h1` grande, `ProfileIdentity` en una línea, bio como cita, enlaces, seguir/compartir, bloquear y moderar en una fila discreta, tarjeta de Ajustes del dueño, recuentos, seguidores en común, afinidad y recencia
- [x] 1.2 `IdentityCard` bajo «Identidad musical»: `min-w-0`, títulos en dos líneas, tope de 32,5 rem, foto del artista definitorio
- [x] 1.3 Fondo con la carátula del álbum definitorio difuminada (decorativo); fondo neutro sin álbum
- [x] 1.4 Tests: perfil público completo, sin álbum definitorio, acciones de bloqueo/moderación con sus permisos

## 2. Anclas y marco

- [x] 2.1 `ProfileAnchors` fijo bajo la cabecera, solo con secciones visibles y sus recuentos; ancla activa por posición al desplazarse; `scroll-margin-top`
- [x] 2.2 `page.tsx` sin columna lateral: contenedor de 1280 px; cuerpo actual a todo el ancho y en su orden
- [x] 2.3 Capas del dueño: `OwnerProfileBar` encima, `EditableBlock` sobre la columna de datos (`wrapDetails`) y la identidad; `?preview=1` con la misma estructura

## 3. Franja de identidad

- [x] 3.1 `IdentityStrip`: `ProfileFicha` | `FingerprintSummary` (década destacada + frases) | `ExploreSection` («Artistas seguidos», enlace a la lista, insignia de afinidad)
- [x] 3.2 Omitir cada parte sin contenido y la franja entera si no queda ninguna
- [x] 3.3 Tests: franja completa, sin huella, sin artistas seguidos, sin nada

## 4. Arreglos

- [x] 4.1 `UserAvatar` cae al monograma si la imagen falla
- [x] 4.2 Test de la Tarjeta de Identidad a 390 px (clases `min-w-0`/recorte) y de la foto del artista definitorio

## 5. Textos, documentación y verificación

- [x] 5.1 Mensajes en `messages/{es,en}/users.json` («Identidad musical», «Artistas seguidos», anclas) y `pnpm run i18n:client-messages`
- [x] 5.2 `docs/05-features/user-profile.md`: cabecera, anclas, franja, plan de las Fases 2 y 3
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 5.4 Verificación en el navegador a 1440, 1024, 820 y 390 px: perfil público sin sesión y perfil privado sin acceso sin cambios (la vista del dueño —modo edición y «cómo te ven»— queda cubierta por los tests de `page.tsx` y `ProfileHeader`: sin sesión en el navegador)
