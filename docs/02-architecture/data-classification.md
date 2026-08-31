# Clasificación de datos — music-platform

**Propósito:** clasificar cada tipo de dato del sistema según su *perdibilidad / reconstruibilidad*, para decidir backup, cacheo, prioridad de recuperación y diseño futuro.

**Por qué este eje y no el origen:** el vocabulario de "source of truth" ya existía en el proyecto, pero disperso y sin taxonomía. ADR 0011 clasifica el catálogo **por origen** (MusicBrainz como source of truth de campos descriptivos, `DO UPDATE` vs `DO NOTHING`) — pero ese eje es solo para ingestión. Este documento clasifica por **qué se pierde y qué se puede regenerar y desde dónde**. Esos dos ejes no coinciden: como revela la clasificación del espejo MusicBrainz (Clase B), que un dato venga de una fuente externa no lo hace "fuente de verdad" — lo hace **reconstruible con costo**, no irreemplazable. Solo los datos propios del usuario son irreproducibles.

## Categorías

### Clase A — Fuente de verdad propia (irreproducible)

Si se pierde, se pierde para siempre: no existe ninguna fuente externa de la que regenerarlo.

- `app_user`, `auth_identity`, `session` — identidad y sesiones (path de auth, ADR 0008: `session` es server-side en Postgres, no caché).
- `rating`, `comment`, `listen_entry`, `favorite` — contenido y actividad del usuario.
- `user_follow`, `user_block` — relaciones sociales.
- `user_list`, `user_list_item` — agregación de contenido por el usuario.

**Implicación de backup:** máxima prioridad. Sin estos datos, la base de usuarios queda vacía o corrupta sin remedio.

### Clase B — Espejo reconstruible de fuente externa

Recuperable re-ingiriendo desde MusicBrainz a costo de *tiempo / rate limit* — no de imposibilidad. El dato vive originalmente en un `mbid` externo; el cacheo bajo demanda lo trae a la base propia.

- `artist`, `release_group`, `release`, `recording`, `track`, `credit`, `membership`.

**Implicación:** el backup es de bajo esfuerzo comparado con Clase A; una re-ingesta completa regenera estas tablas, con el costo real del rate limit (~1.1 s/req, ver `client.ts`) y de que algunas entidades no visitadas se queden fuera hasta ser requeridas.

**Zona gris — artista `type='unknown'` y créditos de feat:** son espejos *incompletos* (stub sin enriquecer, `sql-model.md:106`). Se reconstruyen, pero requieren re-visita del perfil para enriquecerse — mismo patrón de cacheo recursivo.

### Clase C — Derivada / computable

Se recalcula trivialmente desde las categorías anteriores; no requiere backup propio.

- **Agregados de rating** (`rating_average`/`rating_sum`/`rating_count`): hoy son **virtuales** — ni siquiera están materializados; se calculan al vuelo con `AVG()`/`count(*)` en `social.ts:37-39`, apoyados en `idx_rating_*`. No hay ninguna columna de estado derivado que respaldar.

**Implicación:** al no existir estado derivado, el borrado físico de la Clase A no deja nada que desincronizar (argumento estructural de ADR 0009 / Riesgo #11). Si algún día se materializa el agregado, pasa a ser Clase C *materializada*: sigue siendo recalculable desde Clase A, y la sincronización debe usar triggers de Postgres, no lógica de aplicación.

### Clase D — Efímera (reservada, sin ocupantes hoy)

Capa de datos descartable / cache de corta vida, sin garantías de persistencia. **Reservada** para no tener que insertar la categoría retroactivamente; hoy no hay ocupantes:

- El proyecto no tiene caché de datos propia: **Redis está diferido** (C.3 del checklist de infraestructura) y la capa de "cover art cache" solo cachea la **URL**, no los bytes (`data-licensing.md`, Riesgo #9).
- `session` **no** es efímera: es fuente de verdad propia vía Postgres (ADR 0008), no caché en memoria ni JWT.

## Prioridad de recuperación / backup

| Prioridad | Clase | Por qué |
|---|---|---|
| 1 | A — propia | Irreproducible; sin ella no hay usuarios. |
| 2 | D — efímera | Transitoria pero acepta pérdida; de existir (Redis futuro), se respalda por comodidad, no por necesidad. |
| 3 | B — espejo | Reconstruible con costo de rate limit; el backup ahorra tiempo de re-ingesta, no evita pérdida definitiva. |
| 4 | C — derivada | Se recalcula de A/B; no se respalda. |

Esta prioridad está **operacionalizada**: el backup nocturno automático de `music_platform`
(Clase A + B) y de la scratch (Clase D, por comodidad) se implementó y probó — ver
`06-operations/backup-restore.md` (item A.7 del checklist de infraestructura). Las clases C nunca
se respaldan. Cuando se dispare el trigger de criticidad (staging compartido o producción), la
migración a un proveedor gestionado debe re-evaluar esta tabla.

## Retroclasificación de riesgos existentes

Prueba de que el marco recorta casos reales (referencias a `frontend-plan/04-risks.md`):

- **Riesgo #10 (dogpile sobre MusicBrainz)** → **Clase B.** El dato de cache-miss es un espejo reconstruible; el riesgo es de **latencia** (cola de rate limit serializada), no de pérdida. La clasificación lo deja explícito: importa cuánto tarda, no si se pierde.
- **Riesgo #11 (agregados de rating no materializados)** → **Clase C.** Recalculable desde Clase A; hoy virtual, ni siquiera materializado — por eso no hay nada que desincronizar con el borrado físico de ADR 0009 (no-riesgo confirmado).
- **C.10 (namespacing de esquemas, diferido)** → **cruza las clases.** Los schemas lógicos `catalog.*` / `community.*` / `users.*` **se alinean conceptualmente** con Clase B / Clase A / Clase A: el catálogo es mayormente espejo reconstruible, la comunidad y los usuarios son propios. La clasificación da vocabulario para esa distinción aunque no decida la migración física.

## Relación con otros documentos

- **ADR 0011** — clasifica el catálogo por *origen* para ingestión (`DO UPDATE`/`DO NOTHING`); este documento clasifica por *perdibilidad* y abarca todo el modelo. Complementarios, no redundantes.
- **`sql-model.md`** — narra cada tabla individualmente ("por qué existe"); este documento las agrupa por categoría de pérdida.
- **`conventions.md`** — reglas de nomenclatura/diseño; este documento añade el eje de clasificación de datos.
- **Ítem A.6** del checklist de infraestructura — este documento es su resolución.
