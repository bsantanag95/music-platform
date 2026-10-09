## Context

`/welcome` es hoy `TwoDoorOnboarding`: dos secciones hermanas (álbumes / escucha) y un botón final que llama a `POST /api/me/onboarding` y redirige a Inicio. En 375 px mide ~2700 px, no dice quién verá lo elegido, no confirma lo hecho y no ofrece seguir artistas. La lógica de búsqueda ya es compartida (`useTargetSearch`, cambio `improve-welcome-onboarding`).

## Decisiones

**D1 — Los tres pasos viven montados; el inactivo se oculta con `hidden`.** Cada picker guarda su estado local (resultados, lista de registrados/seguidos). Desmontarlos al cambiar de paso lo perdería y obligaría a subir todo el estado al contenedor. Con `hidden` el estado se conserva gratis; las búsquedas solo corren con texto, así que un paso oculto no hace trabajo. Solo el contenedor sabe `step` y los conteos que cada picker reporta por `onCountChange`.

**D2 — Orden: álbumes → artistas → escucha.** Identidad primero (pregunta que ya existía), luego la señal que alimenta «De tus artistas» en Inicio, y al final el presente. Los requisitos conservan los nombres «Puerta 1» y «Puerta 2» (están en código, docs e historial); el paso nuevo se llama «paso de artistas».

**D3 — Seguir artistas reutiliza `PUT/DELETE /api/artists/{id}/follow`.** Idempotentes y sin tope, así que el paso es un tercer picker con el mismo patrón que la Puerta 2 (el elegido sale de los resultados y se lista aparte con la acción inversa; guarda `useRef` contra el doble clic). Los ids de la búsqueda de artistas son locales (los stubs se crean al buscar), que es lo que el endpoint exige.

**D4 — «Saltar» sigue cerrando el onboarding.** Se evaluó dejar `onboarded_at` nulo al saltar sin haber hecho nada, para conservar el enlace pasivo de Inicio. Se descartó: el callback de Google envía a `/welcome` mientras `onboarded_at` sea nulo, así que quien salta volvería al flujo en cada inicio de sesión. El enlace de Inicio queda como está.

**D5 — Un solo botón de salida con etiqueta honesta.** «Saltar por ahora» si no se hizo nada y «Terminar ahora» si ya hay algo; ambos llaman a `finish(picked ids)`. Antes «Saltar por ahora» descartaba en silencio los álbumes elegidos.

**D6 — El resumen es estado del cliente tras el cierre.** No hay ruta nueva: `finish()` hace el `POST`, marca `done` y renderiza el resumen con los conteos que reportaron los pasos; «Ir a Inicio» hace `push("/")` + `refresh()`. Recargar el resumen redirige a Inicio (el guard de la página ya lo hace por `onboarded_at`). «Explorar» solo se ofrece si `isExploreEnabled()` (el servidor lo calcula y lo pasa como prop).

**D7 — El aviso de audiencia lo calcula el servidor.** La página resuelve `resolveNewContentAudience(user.id, "favorite")` y `"diary"` (la misma función que usan los servicios al crear contenido) y los pasa como props, de modo que el aviso nunca contradice lo que se guarda. Texto: «Visibilidad de tus favoritos: Público» con enlace a `/me/settings/privacy` en pestaña nueva (no pierde lo elegido).

**D8 — Corrección de la audiencia sembrada.** `seedFavoriteAlbums` insertaba sin `audience` y caía en el `DEFAULT 'followers'` de la columna, distinto del `public` que `resolveNewContentAudience` da a un favorito. Se resuelve una vez por llamada y se pasa a todas las filas. No se reescriben favoritos ya sembrados (sin migración): el usuario los puede cambiar desde Favoritos.

## Riesgos

- Tres pickers montados a la vez cargan tres campos de búsqueda en el DOM; las carátulas siguen perezosas y los esqueletos están ocultos a lectores de pantalla. El `hidden` los saca también del árbol de accesibilidad.
- `hidden` en un contenedor `flex` pierde ante clases `display`; se aplica sobre un envoltorio sin clases de `display`.
