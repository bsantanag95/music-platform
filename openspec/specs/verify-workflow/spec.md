# verify-workflow Specification

## Purpose
Verificación local de un cambio antes de darlo por terminado: el skill `verify` y `pnpm run verify`, el hook `Stop` del proyecto que corre `typecheck` y `lint` y escala a una persona tras tres rondas fallidas, y el sello `Verified:` de los commits con un gate que por defecto solo observa.
## Requirements
### Requirement: Skill de verificación de extremo a extremo
El repositorio SHALL incluir un skill `verify` en `.claude/skills/verify/` que describa y automatice, en cualquier worktree,
la verificación de un cambio: comprobar precondiciones, correr `typecheck`, `lint` y `test`, correr los smoke tests relevantes
contra una BD de scratch, levantar `next dev` desde el propio worktree y recorrer el feature map con el navegador integrado.
El skill SHALL terminar con un informe que liste cada paso, su resultado y la evidencia (salida de comandos o capturas).

#### Scenario: Verificación completa en un worktree
- **WHEN** un agente ejecuta `verify` en un worktree con `.env` y una `DATABASE_URL` de scratch
- **THEN** el skill corre `typecheck`, `lint`, `test`, los smoke tests relevantes y el recorrido del feature map, y entrega un informe con el resultado de cada paso

#### Scenario: Worktree sin `.env`
- **WHEN** `verify` se ejecuta en un worktree que no tiene `.env`
- **THEN** el skill copia el `.env` desde la raíz del repositorio o, si no existe, se detiene con un mensaje que indica qué falta

### Requirement: Los smoke tests de `verify` solo corren contra una BD de scratch
`verify` SHALL habilitar `ALLOW_SMOKE_ON_REAL_DB=1` únicamente cuando el nombre de la BD de `DATABASE_URL` indique que es desechable
(`scratch`, `test`, `ci` o `tmp` como palabra) o cuando la persona la autorice con `VERIFY_ALLOWED_DB`. Si el nombre no lo indica o no puede
determinarse, el skill SHALL omitir los smoke tests sin ejecutarlos y SHALL indicar cómo apuntar a una BD de scratch.

#### Scenario: DATABASE_URL apunta a una BD que no parece de scratch
- **WHEN** `verify` detecta que la BD de `DATABASE_URL` no tiene nombre de BD desechable ni está autorizada
- **THEN** no ejecuta ningún smoke test, lo informa como "omitido: BD real" y no marca el paso como verificado

#### Scenario: BD de scratch
- **WHEN** la BD de `DATABASE_URL` se llama `music_platform_scratch`
- **THEN** `verify` ejecuta los smoke tests pedidos con `ALLOW_SMOKE_ON_REAL_DB=1` solo para esa corrida

### Requirement: Hook `Stop` del proyecto
El proyecto SHALL definir en `.claude/settings.json` (no en `settings.local.json`) un hook `Stop` que ejecute `typecheck` y
`lint` cuando haya cambios de código sin verificar. Si fallan, el hook SHALL devolver la salida resumida al agente para que
corrija; no SHALL ejecutar `test` ni `build`.

#### Scenario: Fallo de typecheck
- **WHEN** el agente intenta terminar y `pnpm run typecheck` falla
- **THEN** el hook impide terminar y entrega al agente los errores resumidos

#### Scenario: Sin cambios de código
- **WHEN** el agente termina y el árbol de trabajo no tiene cambios de código
- **THEN** el hook no ejecuta ningún comando y no bloquea

### Requirement: Escalado a un humano tras tres rondas fallidas
El hook `Stop` SHALL contar las rondas fallidas por sesión. En la tercera ronda con el mismo fallo SHALL dejar de bloquear y SHALL
emitir un mensaje que pida intervención humana e indique el comando que falla y por qué. Una ronda exitosa SHALL reiniciar el contador.

#### Scenario: Tercera ronda fallida
- **WHEN** el hook ya bloqueó dos veces en la sesión y el check sigue fallando
- **THEN** deja terminar y emite un aviso a la persona con el comando fallido y su salida

#### Scenario: Éxito reinicia el contador
- **WHEN** una ronda de verificación pasa tras uno o dos fallos
- **THEN** el contador de rondas fallidas de la sesión vuelve a cero

### Requirement: Sello de verificación en los commits
Los mensajes de commit SHALL poder incluir un trailer `Verified:` con la lista de verificaciones realizadas (por ejemplo
`typecheck,lint,test,build,smoke:<nombre>,e2e`) o `none`. Los commits sin sello o con `none` SHALL poder consultarse.

#### Scenario: Commit con sello
- **WHEN** se crea un commit tras ejecutar `verify` con éxito
- **THEN** su mensaje incluye un trailer `Verified:` con los pasos realmente ejecutados

#### Scenario: Consulta de commits sin verificar
- **WHEN** se consulta el registro de verificación
- **THEN** aparecen los commits cuyo sello falta o es `none`

### Requirement: Gate de commit en modo observe por defecto
El gate de commit SHALL tener tres modos (`off`, `observe`, `enforce`) y SHALL operar en `observe` por defecto: registra lo que
bloquearía sin bloquear. En `enforce` SHALL bloquear un commit sin verificación, pero SHALL dejar pasar el siguiente si ya se
bloquearon dos commits en la sesión.

#### Scenario: Modo observe
- **WHEN** se hace un commit sin sello y el gate está en `observe`
- **THEN** el commit se crea y el hecho queda registrado como "habría bloqueado"

#### Scenario: Válvula de escape en enforce
- **WHEN** el gate está en `enforce` y ya bloqueó dos commits en la sesión
- **THEN** el tercer commit se permite aunque no tenga sello

