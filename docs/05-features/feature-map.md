# Feature map: flujos críticos de la aplicación

Lista de los flujos que una persona hace en la aplicación, vistos desde fuera: ruta de entrada, pasos, cómo se localizan los
controles (rol y nombre accesible, en español) y qué debe pasar. Es la **rúbrica** de dos cosas:

- el skill `verify` (`.claude/skills/verify/SKILL.md`), cuando recorre la app en el navegador después de un cambio;
- la suite E2E de Playwright (`e2e/*.e2e.ts`, `pnpm run test:e2e`), que automatiza los flujos marcados como "E2E".

Si cambias uno de estos flujos (ruta, texto de un control, resultado), actualiza esta página y su test en el mismo cambio. Un flujo
nuevo y crítico entra aquí antes que en la suite. Decisión de fondo: ADR 0062; operación: `docs/06-operations/verification.md`.

## Convenciones de los E2E

- Idioma: español (`/es/...`). Los controles se buscan por **rol y nombre accesible** (`getByRole`, `getByLabel`); `data-testid`
  solo si no hay alternativa accesible (hoy ninguno).
- Datos: una BD de scratch sembrada por `e2e/lib/seed.ts` (artista, álbum de 3 canciones, lista y dos usuarios `e2e_*`), borrada al
  terminar. El catálogo es sintético (MBID `e2e00000-0000-4000-8000-*`) y está marcado como ya sincronizado.
- Red: el servidor de prueba arranca **sin** `MUSICBRAINZ_USER_AGENT`, `WIKIMEDIA_USER_AGENT` ni `LISTENBRAINZ_USER_AGENT`, así que esos
  clientes fallan cerrados y ningún test sale a internet. Las páginas muestran "MusicBrainz no respondió" donde corresponde.
- Sesión: los flujos F3 a F5 usan la sesión del usuario `e2e_tester` (creada por el setup global); F1 y el visitante de F5 usan una vacía.
- Sin reintentos automáticos: un test inestable se arregla en su causa o se elimina con su motivo.
- Hidratación: antes de interactuar con un control de cliente, el test espera a que React lo haya hidratado
  (`e2e/lib/hydration.ts`). Sin eso, un clic temprano envía el formulario como un GET nativo.

## Flujos

### F1 — Iniciar sesión

- **Entrada:** `/es/auth/login`. **E2E:** `e2e/login.e2e.ts`.
- **Pasos:** escribir usuario o email en «Email o nombre de usuario» y la contraseña en «Contraseña» → botón «Iniciar sesión».
- **Esperado:** sale de `/auth/login`; con sesión, volver a `/auth/login` redirige. Una contraseña incorrecta deja en la pantalla con un
  aviso (`role=alert`) y **nunca** deja la contraseña en la URL.

### F2 — Buscar y abrir un álbum

- **Entrada:** `/es/search?type=album`. **E2E:** `e2e/catalog.e2e.ts`.
- **Pasos:** escribir en el cuadro «Texto a buscar» → «Buscar» → abrir el álbum del resultado.
- **Esperado:** la ficha `/es/album/<slug>-<id>` muestra el título (h1), el artista y la región «Canciones» con sus pistas enlazadas. Una
  búsqueda sin coincidencias no rompe la página. Sin MusicBrainz, la búsqueda sigue mostrando lo que hay en el catálogo.

### F3 — Valorar un álbum

- **Entrada:** la ficha del álbum, con sesión. **E2E:** `e2e/rate.e2e.ts`.
- **Pasos:** en «Tu relación», grupo «Tu nota en estrellas» → marcar «4,0 estrellas».
- **Esperado:** la nota queda marcada, persiste al recargar y el álbum aparece en `/es/me/ratings`.

### F4 — Añadir un álbum a una lista

- **Entrada:** la ficha del álbum, con sesión. **E2E:** `e2e/lists.e2e.ts`.
- **Pasos:** «Tu relación» → «Elegir listas» → marcar la lista → «Listo».
- **Esperado:** el panel dice que está en una de tus listas, y la lista (`/es/users/<usuario>/lists/...`) contiene el álbum.

### F5 — Perfil propio y de otra persona

- **Entrada:** `/es/users/<usuario>`. **E2E:** `e2e/profile.e2e.ts`.
- **Pasos:** abrir el propio perfil; abrir el de otra persona pública y pulsar «Seguir»; abrir el mismo perfil sin sesión.
- **Esperado:** el propio perfil muestra el nombre (h1), «Editar perfil», «Ver como visitante» y sus listas; seguir a otra persona cambia el
  botón a su estado de seguida; un visitante ve el perfil público y «Iniciar sesión para seguir».

## Flujos solo manuales (aún sin E2E)

Se recorren con `verify` cuando el cambio los toca. Candidatos a E2E cuando haya motivo (un incidente o un cambio frecuente).

| Flujo | Entrada | Por qué no está automatizado |
|---|---|---|
| Registro con email y casilla de Términos | `/es/auth/register` | Crea cuentas; cubierto por `smoke-test-*` de auth y tests de componente. |
| Inicio de sesión con Google | `/es/auth/login` | Depende de un proveedor externo; cubierto por `smoke-test-google-oauth.ts`. |
| Escribir una reseña | álbum → «Escribir reseña» | Editor largo; cubierto por tests de componente. |
| Registrar una escucha y ver el diario | álbum → «+ Registrar»; `/es/me/diary` | Depende de la zona horaria; cubierto por `smoke-test-diary.ts`. |
| Colección física y lista de deseos | álbum → «Colección» | Varios formatos y estados. |
| Ingesta bajo demanda desde MusicBrainz | cualquier artista nuevo | Requiere red real; cubierto por `smoke-test-ingestion.ts` con `fetch` mockeado. |
| Compartir y Láminas | «Compartir» | Genera imágenes; cubierto por los `smoke-test-*laminas.ts`. |
| Notificaciones y correos | `/es/notifications` | Dependen de eventos de otros usuarios y de correo. |
