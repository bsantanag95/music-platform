# Operaciones de backup y restore

Documento operativo de respaldo de la base de datos local. Forma parte del checklist de
infraestructura (ítem **A.7**) resuelto con evidencia real de una restauración de prueba.

## Por qué existe (contexto — léelo antes de juzgar como sobre-ingeniería)

Este runbook se escribió **mientras la base sigue siendo puramente local y de desarrollo**, con
datos de prueba: el "costo de no tener backup" hoy no es catastrófico, es rehacer trabajo de
setup (cuentas de prueba, ratings/comments de prueba, re-ingesta de artistas desde MusicBrainz —
que además es gratis por caer en la categoría **Espejo reconstruible** de
`02-architecture/data-classification.md`). **No hay actividad real de usuario en juego todavía.**

Se montó de todos modos por tres razones, en orden de peso:

1. **La asimetría costo/impacto es correcta aunque el impacto hoy sea bajo.** Un script + una
   tarea agendada + una prueba de restore cuesta casi nada; evita la pérdida total de los datos
   propios (Clase A) el día que sí importen.
2. **La primera prueba de restore real es más fácil hacerla con calma ahora**, sobre datos de
   prueba, que el día que haya usuarios reales y sea la primera vez bajo presión.
3. **Deja la política comprobada**, no solo "confiamos en que la máquina local aguanta": se midió
   cuánto tarda restaurar y se confirmó que funciona.

### ⚠️ Trigger de criticidad — cuándo esto pasa de "buena práctica" a "crítico"

Este runbook pasa de ser *buena práctica de desarrollo* a *política crítica* el momento en que la
instancia **deje de ser puramente local/dev y empiece a tener actividad real de usuario**, es
decir:

- un **staging compartido** con datos con los que otra persona trabaja, o
- una **producción** con usuarios reales.

Ese es el punto donde la afirmación "el costo de no hacerlo es rehacer setup" deja de ser cierta y
se vuelve "pérdida irreversible de Clase A". **Cuando ocurra, este runbook debe re-leerse como
requisito de severidad alta** y en general la infraestructura debe migrar de local a un proveedor
gestionado (que suele traer PITR por defecto) — ver sección "Migración futura".

> Quien lea esto en seis meses debe entender que se armó con datos de prueba **a propósito**, para
> que la práctica esté lista antes de que el riesgo sea real. No es sobre-ingeniería: es
> anticipación de bajo costo.

## Arquitectura actual del entorno

- **Instancia:** PostgreSQL 18, local, levantada a mano (sin Docker), en `localhost:5433`.
  También existe PostgreSQL 17 en `5432` (otros proyectos; no es esta base).
- **BD principal:** `music_platform` → datos de Clase A (usuarios, ratings, comments, etc.) y
  catálogo Clase B.
- **BD scratch:** `music_platform_scratch` → usada por los smoke tests. Es **Efímera** en la
  clasificación de datos: se respalda por conveniencia, no por necesidad.
- **Conexión:** `DATABASE_URL` en `.env` (host/puerto/usuario/password). El nombre de BD objetivo
  del backup **no** depende del nombre en `DATABASE_URL` (que puede apuntar a la scratch para
  tests): se configura con `PRINCIPAL_DB_NAME` (default `music_platform`).

## Componentes

| Componente | Ruta | Qué hace |
|---|---|---|
| Script de backup | `scripts/backup-db.ts` | `pg_dump` (custom) de principal y scratch a `backups/` + retención. |
| Wrapper | `scripts/backup-db.cmd` | Fija el cwd y ejecuta el script vía `node` + `tsx` (evita el shim `.CMD` de pnpm que Task Scheduler no resuelve bien). |
| Tarea agendada | `music-platform-db-backup` | Ejecuta el wrapper a diario, 03:30. |
| Salida | `backups/<db>.<timestamp>.dump` | Dumps custom-format. `backups/` está en `.gitignore`. |
| Log | `backups/backup.log` | Salida de cada corrida. |
| Comando manual | `pnpm run db:backup` | Equivalente a ejecutar el backup a mano. |

## Hacer un backup manual

```bash
pnpm run db:backup
# o directamente:
npx tsx --env-file=.env scripts/backup-db.ts
```

Produce:

```
backups/music_platform.2026-08-31T21-12-50.dump   (principal, Clase A + B)
backups/music_platform_scratch.2026-08-31T21-12-50.dump   (scratch, Efímera)
```

**Retención:** se conservan los últimos `BACKUP_RETENTION` dumps por BD (default **7**); los más
viejos se eliminan automáticamente al correr el script. Si querés más historia, subí la variable
(no recomendado sin necesidad).

**Variables de entorno relevantes:** `DATABASE_URL` (conexión), `PRINCIPAL_DB_NAME` (default
`music_platform`), `PG_BIN_DIR` (autodetección si falta), `BACKUP_RETENTION` (7),
`BACKUP_DIR` (default `<repo>/backups`).

## Punto de restauración (PITR) — aclaración de alcance

Esto es **backup nocturno con retención de 7 días, no PITR**. El PITR (recovery al minuto exacto)
requiere WAL archiving activo (`wal_level=replica`, `archive_command`, `pg_basebackup`), que **no
está configurado**. La ventana de pérdida posible es de hasta ~1 día de cambios.

Se difiere el PITR por el criterio "deferred by default" del proyecto y porque, a la escala y
etapa actual (dev local, datos de prueba), perder hasta un día no es aceptable pero tampoco
tiene costo de oportunidad relevante. **Migración recomendada:** cuando el trigger de criticidad se
dispare (staging compartido o producción), migrar a un proveedor gestionado que traiga PITR y
backups automáticos por defecto, o activar WAL archiving local si se mantiene on-premise.

## Restaurar (procedimiento probado)

> El flujo aquí es el que se validó el **2026-08-31** y quedó registrado más abajo.

### Restaurar a una BD temporal (prueba / inspección)

```bash
# 1. Crear la BD destino temporal
psql -h localhost -p 5433 -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS music_platform_restore_test;" \
  -c "CREATE DATABASE music_platform_restore_test;"

# 2. Restaurar el dump custom más reciente de la principal
pg_restore -h localhost -p 5433 -U postgres -d music_platform_restore_test \
  --no-owner --no-privileges backups/music_platform.<timestamp>.dump

# 3. Sanity check: los conteos deben coincidir con la BD viva
psql -h localhost -p 5433 -U postgres -d music_platform_restore_test \
  -c "SELECT 'artist' t, count(*) c FROM artist
      UNION ALL SELECT 'app_user', count(*) FROM app_user
      UNION ALL SELECT 'rating', count(*) FROM rating
      UNION ALL SELECT 'release_group', count(*) FROM release_group;"

# 4. Al terminar, dropear la temporal
psql -h localhost -p 5433 -U postgres -d postgres \
  -c "DROP DATABASE IF EXISTS music_platform_restore_test;"
```

### Restaurar a la BD principal (recuperación real)

Usar el mismo procedimiento pero con `CREATE DATABASE ... ` sobre la BD a recuperar
(`music_platform`), **asegurándose de que la app esté detenida** y de borrar la BD dañada antes
(no se puede restaurar sobre una BD con conexiones activas). Alternativa más segura: restaurar a
una temporal, validar, y luego `ALTER DATABASE ... RENAME` / desmontar la vieja.

## Registro de la prueba de restore (evidencia de A.7)

| Campo | Valor |
|---|---|
| Fecha | 2026-08-31 |
| Dump usado | `backups/music_platform.2026-08-31T21-12-50.dump` |
| Restaurado a | `music_platform_restore_test` (temporal, dropeada después) |
| Duración del restore | **~782 ms** |
| Resultado | ✅ Éxito — conteos idénticos al vivo |
| Sanity: artist | 427 |
| Sanity: release_group | 2184 |
| Sanity: app_user | 1 |
| Sanity: rating | 1 |
| Triggers restaurados | 5 (no internos) |
| Migraciones registradas | 12 |

**Conclusión:** la restauración funciona y es rápida. La política queda *probada*, no solo
configurada.

> Cuando cambie sustancialmente el volumen o el esquema (migraciones nuevas, datos reales),
> repetir esta prueba y actualizar este registro.

## Migración futura

En cuanto se dispare el trigger de criticidad (staging compartido o producción), se recomienda
migrar a un proveedor gestionado (RDS, Cloud SQL, Neon, Supabase, Railway…). En ese escenario:

- Los backups automáticos y PITR suelen venir por defecto: el trabajo pasa de "configurarlos" a
  "confirmar la política y probarla" (mismo criterio que A.7).
- Este runbook se adapta a las herramientas/procedimientos del proveedor y el enfoque pasa de
  operativo local a confirmación de políticas.
- La clasificación de `data-classification.md` (Clase A irrecuperable vs Clase B reconstruible)
  sigue guiando la prioridad de recuperación en cualquier entorno.
