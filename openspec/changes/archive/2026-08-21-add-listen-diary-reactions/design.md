# add-listen-diary-reactions — Diseño

## Context

La Fase 5 necesita una capa de presencia (registrar qué se escuchó, sin exigir opinión) sobre el
grafo social ya construido (`add-social-profile-follow`, archivado). El modelo actual de `rating`
(una valoración vigente por usuario/objetivo, con CHECK de coherencia estrellas↔detallada) es la
fuente de verdad de "la opinión actual" y no debe reutilizarse como historial. Se introduce
`listen_entry` como diario append-only con reacción emocional, sin estrellas, manteniendo `rating`
intacto.

El proyecto sigue un patrón establecido para funciones sociales autenticadas:
servicios en `src/services/social/`, rutas bajo `/api/me/**`, schemas Zod en
`src/lib/api/schemas.ts`, validación de errores con `ApiError.code`, paginación cursor-libre
(repositorio `src/lib/api/pagination.ts`), y componentes interactivos client-side con
`useState` + fetch vía `src/lib/api/client.ts`.

## Goals / Non-Goals

**Goals:**
- Registrar una escucha sobre artista, álbum o canción con un solo gesto ("Marcar como escuchado").
- Completar la entrada después (impresión, contexto, reacción, audiencia) vía `PATCH`.
- Persistir la audiencia desde el inicio para el futuro feed, aunque en este incremento solo se
  consulte el diario propio.
- Borrar entradas propias (físico) para corregir errores.
- Mantener `rating` 100% independiente de `listen_entry`: ninguna mutación de una entrada toca la
  valoración vigente.

**Non-Goals:**
- No feed de actividad, ni escuchas visibles en perfiles o en páginas de catálogo.
- No scrobbling automático (Spotify/Apple Music).
- No edición de estrellas ni sincronización con rating (reemplazado por reacción emocional).
- No listas ni favoritos.
- No impresión de comentarios de otras personas ni interacción social sobre entradas.

## Decisions

### D1. Columna `reaction` nullable con CHECK, no tabla ni enum de Postgres
Valores técnicos estables `liked`/`loved`/`obsessed`/`neutral`/`disliked` y `NULL`. El `CHECK`
garantiza integridad a nivel de base (patrón del proyecto: reglas de negocio críticas en SQL).
`NULL` = sin dato; `neutral` = elección explícita de neutralidad; ambos se distinguen en la UI.
**Alternativas descartadas:** tabla `reaction` (overkill para 5 valores, el catálogo futuro es
extensible con una migración de CHECK simple) y texto localizado persistido (rompe i18n y datos
históricos).

### D2. `listen_context` con inferencia servidor + override del usuario
En `POST`, el servidor propone `first_listen` si es la primera entrada del usuario sobre ese
objetivo, si no `relisten`. El `PATCH` permite corregirlo (p. ej. a `rediscovery`).
**Alternativa descartada:** solo inferido sin control de UI — contradice la filosofía de que el
contexto es elección del usuario.

### D3. `audience` con default `followers`, editable por entrada
Misma taxonomía que el modelo de privacidad de la Fase 5 (`private`/`followers`/`public`). El
default de una entrada nueva es `followers` (decisión de producto cerrada). Perfiles privados
siguen la regla ya adoptada: actividades privadas por defecto y una entrada puede hacerse pública
explícitamente. Este incremento no expone escuchas ajenas, así que la audiencia solo define qué
verá el futuro feed/perfil; se valida en backend y se persiste ya.

### D4. `body` limitado a 500 caracteres
Validado en Zod (servicio y API) y en el atributo `maxLength` del textarea. Suficiente para una
impresión, impide que el diario se convierta en una plataforma de reseñas.

### D5. API bajo `/api/me/diary`
- `POST /api/me/diary` — crea entrada mínima; body `{ target, targetId }`.
- `GET /api/me/diary?page=&pageSize=` — diario propio, orden `created_at DESC, id DESC`,
  paginación estilo `GET /api/me/following`.
- `PATCH /api/me/diary/[id]` — `{ body?, listenContext?, reaction?, audience? }`; cada campo
  opcional, al menos uno.
- `DELETE /api/me/diary/[id]` — borrado físico; 404 si no es del propietario.
Códigos de error nuevos: `LISTEN_ENTRY_NOT_FOUND`, `DIARY_TARGET_INVALID` (y reutiliza
`AUTH_REQUIRED`, `VALIDATION_ERROR`, `PERMISSION_DENIED`, `INVALID_TARGET`).
**Alternativa descartada:** rutas bajo `/api/catalog/[target]/[id]/listens` — este incremento no
expone escuchas ajenas y `/me` es coherente con el resto de la base social.

### D6. Componente `ReactionPicker` y representación "texto + icono opcional"
Taxonomía con etiquetas i18n es/en y un icono discreto por reacción como refuerzo. El texto siempre
es visible (accesibilidad: no depender de color/emoji). Se reutiliza en el panel de ampliación y en
el listado del diario. `null` (ausencia de dato) no renderiza etiqueta en los listados — la
ausencia es la señal de que no hubo reacción, distinta de `neutral` (etiqueta "Neutro" con icono
propio). En el selector, "Sin reacción" es una opción explícita del radio group.

### D7. Flujo rápido: `POST` inmediato + panel de ampliación
"Marcar como escuchado" hace `POST` y optimísticamente muestra la entrada en el diario; un panel
`<ListenEntryForm>` permite `PATCH` de los campos opcionales. Coherente con la decisión de producto
"Registro rápido + ampliar" y con la pauta de TanStack Query solo para datos posteriores al primer
render (aquí `useState` + refetch manual es suficiente).

## Risks / Trade-offs

- **[Confusión `neutral` vs `null`]** → Persistencia distinta (valor vs NULL) y representación UI
  diferenciada; tests explícitos de ambos casos.
- **[El diario crece sin límite]** → Append-only es intencional (historial); la paginación de
  `GET` lo maneja. Borrado físico solo como corrección del propietario.
- **[Extender reacciones en el futuro]** → Requiere migración del `CHECK`; los textos i18n son
  aditivos sin tocar datos históricos.
- **[Riesgo de que una escucha "contamine" rating]** → D1/D7: `listen_entry` no tiene columna de
  estrellas ni trigger hacia `rating`; la independencia se cubre con tests de integración del
  servicio.
- **[Doble POST simultáneo en la inferencia de contexto]** → Dos registros concurrentes sobre el
  mismo objetivo pueden leer `count = 0` y proponer ambos `first_listen`. No viola constraints ni
  pierde datos; el contexto es corregible por `PATCH`. Mitigación opcional futura: contar tras el
  insert o transacción.
- **[Rutas `/me` crecen]** → Agrupación funcional ya existente; se documentan en contracts.md
  junto al resto de la base social.

## Migration Plan

1. Aplicar `0008_listen_entry.sql` con `pnpm run db:migrate` (BD de desarrollo y scratch).
2. Espejar en `src/db/schema.ts` y exportar `ListenEntryRow`.
3. Implementar servicio + rutas + schemas; correr typecheck/lint/test/build.
4. Correr `scripts/smoke-test-diary.ts` contra BD scratch (`ALLOW_SMOKE_ON_REAL_DB=1`) y limpiar
   fixtures; no se tocan artistas del catálogo.
5. Rollback: el `DROP TABLE listen_entry` se puede revertir con una migración nueva (nunca editar
   `.sql` aplicado); no afecta tablas existentes.

## Open Questions

- Nombre final de la superficie de navegación del diario en el shell autenticado (p. ej.
  `/me/diary`) y su posición en el menú — se resuelve en el apply siguiendo la navegación social
  existente.
- ¿Se muestra el contador total de entradas en el diario? Se decide en el apply con los estados de
  la lista.