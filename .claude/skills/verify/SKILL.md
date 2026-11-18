---
name: verify
description: Verifica un cambio de extremo a extremo antes de commitear o dar algo por terminado en este proyecto — precondiciones del worktree, review/typecheck/lint/test, smoke tests contra una BD de scratch y recorrido de la app en el navegador integrado. Úsalo al terminar una tarea, antes de un commit o cuando el usuario pida "verifica", "prueba que funciona" o "revisa antes de cerrar".
---

# verify

Receta para probar un cambio como lo haría QA. **Verificar es ejecutar el cambio**, no releer el diff. Termina siempre con un
informe que liste cada paso, su resultado y la evidencia; no digas "verificado" de algo que no corriste.

## 1. Precondiciones (barato, siempre)

```bash
node --import tsx scripts/verify/preflight.ts
```

- Confirma que estás en el **worktree del cambio** (`toplevel`), no en la raíz con otros agentes. Si el cwd no es el worktree, vuelve a él antes de seguir.
- Si falta `.env`, lo copia desde la raíz; sin ninguno, se detiene (copia `.env.example`).
- `smokeAllowed` indica si la BD de `DATABASE_URL` es de scratch (nombre con `scratch`/`test`/`ci`/`tmp`). **Si es `false`, no corras smoke tests** y repórtalo como "omitido: BD real" (no es un paso verificado). Para habilitar una BD concreta: `VERIFY_ALLOWED_DB=<nombre>`.

## 2. Checks baratos (fallan rápido)

```bash
pnpm run verify            # review (REVIEW.md) → typecheck → lint → test:related (solo tests del diff)
pnpm run verify -- --full  # suite completa de tests (~19 min en esta máquina) + build
```

Se detiene en el primer fallo. Un fallo se corrige en la causa: **no reintentes tests inestables, no agregues `sleep`, no saltes el test**.
Si algo sigue fallando tras 3 rondas, para y pide ayuda a la persona explicando qué falla y por qué no pudiste resolverlo.

`review` aplica los ítems de `REVIEW.md` cuyo disparador coincide con el diff (se lee de `main`). Un ítem en `FALLA` bloquea; uno en `REVISAR` lo revisas tú contra su **Check**.

## 3. Smoke tests relevantes (solo con BD de scratch)

```bash
pnpm run verify -- --smoke ingestion,routes
```

Cada nombre corre `scripts/smoke-test-<nombre>.ts` con `ALLOW_SMOKE_ON_REAL_DB=1` **únicamente** si el preflight lo permitió. Elige según lo que tocaste:

| Tocaste… | Smoke tests |
|---|---|
| `src/services/catalog/`, `musicbrainz/`, discografía, ediciones | `ingestion` (primero; exige BD **virgen**), `routes`, `discography-cache`, `album-editions`, `new-endpoints`, `recording-search`, `unknown-enrichment` |
| Artista: perfil, integrantes, créditos | `artist-profile`, `artist-lineup`, `membership-sync`, `personnel-credits`, `artist-by-id` |
| Sesión, login, cuenta, correo | `keep-signed-in`, `google-oauth`, `password-reset`, `email-verification`, `account-settings` |
| Social, seguidores, actividad, comentarios | `social`, `community-activity`, `comment-likes`, `comment-replies`, `artist-comment-topics` |
| Diario, notificaciones | `diary`, `diary-social`, `notifications` |
| Conciertos | `concerts`, `shared-concerts`, `community-concerts`, `concert-links-tours` |
| Géneros, premios, explorar, calendario | `genres`, `music-awards`, `explore-collections`, `release-calendar` |
| Compartir y Láminas | `share-relation`, `share-user-content`, `top-laminas`, `tier-laminas`, `year-laminas`, `discography-lamina` |

`pnpm run smoke:ci` corre de una vez la lista del CI (`scripts/smoke-lib/ci-list.ts`), en orden, contra una BD de scratch **virgen** (`ingestion` la exige): sirve para reproducir el job `integration`.

Si usaste una BD con datos reales, **limpia los fixtures** (ver `docs/06-operations/smoke-tests.md`). Nunca resetees ni borres datos que no creó el smoke test.

## 3b. Flujos críticos (E2E, cuando el cambio toca su UI o datos)

```bash
E2E_CHANNEL=msedge pnpm run test:e2e   # sirve un build de producción; `E2E_SKIP_BUILD=1` reutiliza el .next si no cambió el código
```

Corre los 5 flujos de `docs/05-features/feature-map.md` (login, buscar y abrir álbum, valorar, añadir a lista, perfil) contra la BD de scratch y un servidor sin salida a internet. Exige scratch por sí solo (aborta si no lo es). Un fallo deja traza y captura en `e2e/.results/` y un informe en `e2e/.report/`. No reintentes: arregla la causa. Si tu cambio modifica un flujo, actualiza el feature map y su test en el mismo cambio.

## 4. Recorrido en el navegador (cambios visibles)

Solo si el cambio se ve en la app. **Nunca uses `preview_start` para esto en un worktree**: sirve la raíz, no tu código.

1. Levanta el servidor **desde el worktree** en un puerto libre: `pnpm exec next dev -p 3101` (en segundo plano) y espera "Ready".
2. Abre `http://localhost:3101` en el navegador integrado y recorre lo que tocaste: usa los flujos de `docs/05-features/feature-map.md` como rúbrica y, además, las páginas y estados afectados (vacío, con datos, error, responsive, es/en).
3. Revisa consola y red (`read_console_messages`, `read_network_requests`) y toma captura como evidencia.
4. Para sesiones iniciadas hace falta un usuario de prueba de la BD de scratch; no uses cuentas reales.
5. Detén el servidor al terminar.

## 5. Informe y sello

Entrega una tabla: paso → resultado → evidencia (comando/salida o captura), más lo **omitido y por qué**.

Para sellar el commit con lo que realmente pasó sobre este mismo árbol:

```bash
node --import tsx scripts/verify/seal.ts --suggest   # imprime p. ej. "Verified: review,typecheck,lint,test"
```

Pega esa línea como trailer del mensaje de commit (solo si imprime pasos; si imprime `Verified: none` el árbol cambió desde la última corrida: vuelve a correr `pnpm run verify`). Si no se verificó, usa `Verified: none: <motivo>`.
El gate (`VERIFY_GATE`, por defecto `observe`) solo registra lo que habría bloqueado en `.verify/log.jsonl`.

## Reglas

- No commitees ni hagas push: eso solo cuando la persona lo pida (ver `AGENTS.md`).
- Un fallo no se oculta: repórtalo con la salida real.
- Este skill no cambia el código de la aplicación; si la verificación revela un bug, corrige y vuelve a correr desde el paso 2.
