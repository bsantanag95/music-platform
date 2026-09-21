## 1. Base de datos y servicio

- [x] 1.0 Verificar el siguiente número de migración libre (`0037`) y escribir a mano
      `drizzle/0037_preserve_updated_at_flag.sql`: `CREATE OR REPLACE` de
      `trg_user_list_set_updated_at()` y `trg_collection_entry_set_updated_at()` para que, con
      `current_setting('app.preserve_updated_at', true) = 'on'`, conserven `OLD.updated_at` y, sin el
      indicador, pongan `now()` como hoy; `docs/03-data/sql-model.md`
- [x] 1.1 `src/services/social/apply-audience.ts`: `previewApplyAudience(userId, audience)` (cuatro
      conteos de filas con `audience <> $audience` y tres conteos de destacados restringidos a esas
      filas: listas fijadas, álbumes favoritos fijados, entradas de diario destacadas) y
      `applyAudienceToExisting(userId, audience)` (una transacción con cuatro `UPDATE ... WHERE
      dueño AND audience <> $audience RETURNING id`; listas solo `kind = 'standard'`; sin tocar
      `updated_at` ni otras columnas). Verificar el nombre real de las columnas dueño de cada tabla
- [x] 1.2 Tests unitarios (`apply-audience.test.ts`): aplica a los cuatro tipos, omite lo que ya tiene
      la audiencia, cuenta destacados, idempotencia (segunda vez con ceros), atomicidad (si un
      `UPDATE` falla no queda ningún tipo modificado), solo filas del usuario, listas no estándar
      intactas, la preferencia guardada no cambia
- [x] 1.3 Verificar contra una base de pruebas real (script `tsx` sobre una base temporal, como en el
      arreglo de afinidad) que con el indicador `updated_at` de listas y colección se conserva, que sin
      él sigue avanzando, y que el feed no genera eventos por la acción

## 2. Contrato y rutas

- [x] 2.1 `src/lib/api/schemas.ts`: `ApplyAudienceRequestSchema` (`{ audience }`, enum de tres
      valores, sin `null`), `ApplyAudiencePreviewResponseSchema` y `ApplyAudienceResultSchema`
- [x] 2.2 `GET /api/me/default-audience/apply?audience=` (vista previa) y `POST` con `{ audience }`
      en `src/app/api/me/default-audience/apply/route.ts`; sesión requerida (`AUTH_REQUIRED`),
      validación (`VALIDATION_ERROR`), mismas convenciones de errores que las demás rutas `me`
- [x] 2.3 Tests de ruta (`route.test.ts`): 401 sin sesión, 400 con audiencia inválida u omitida,
      200 con conteos, POST reenvía al servicio con el usuario de la sesión
- [x] 2.4 `docs/04-api/contracts.md`: documentar ambos endpoints junto a `PATCH /api/me/profile`

## 3. Interfaz

- [x] 3.1 Llamadas con `apiFetch` desde el componente (como el PATCH existente) y los esquemas de 2.1
- [x] 3.2 `DefaultAudienceSettings.tsx`: botón "Aplicar a lo existente" (desactivado con "Según el
      tipo"), vista previa, `ConfirmDialog` con conteos por tipo, aviso de destacados y nota de
      diario destacado visible, mensaje "nada que cambiar", resultado y `router.refresh()`,
      estados de carga y error accesibles
- [x] 3.3 Mensajes `es`/`en` en `messages/{es,en}/users.json` (etiquetas, confirmación, conteos con
      plural, avisos, resultado) y actualizar el texto del control ("lo existente solo cambia con
      Aplicar a lo existente")
- [x] 3.4 Tests de componente (`DefaultAudienceSettings.test.tsx`): botón desactivado con "Según el
      tipo", flujo con confirmación, cancelar no llama al POST, "nada que cambiar" sin diálogo,
      resultado tras aplicar, error accesible

## 4. Documentación

- [x] 4.1 `docs/05-features/user-profile.md`: describir la acción, su alcance, los destacados y que la
      preferencia sigue sin ser retroactiva
- [x] 4.2 Verificar que el texto del control y `docs/04-api/contracts.md` coinciden con la spec

## 5. Verificación

- [x] 5.1 `npm run typecheck`, `npm run lint` y `npm run test` en verde
- [x] 5.2 Probar manualmente en el navegador: elegir una audiencia, aplicar con destacados, ver los
      conteos y el aviso, confirmar, comprobar el perfil con otra cuenta, repetir (ceros) y
      comprobar que con "Según el tipo" el botón está desactivado
