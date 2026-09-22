-- Migración 0043: subtipo "Camino" sobre user_list + tracking de progreso
-- sobre listas ajenas. openspec: add-camino.
--
-- Camino reutiliza user_list/user_list_item con kind = 'custom_journey',
-- mismo patrón que 'artist_journey' (migración 0027) pero sin discografía de
-- fondo: no necesita journey_artist_id ni ninguna columna nueva, solo un
-- tercer valor de kind.
--
-- El tracking de progreso sobre una lista ajena vive como un eje adicional
-- de list_save (mismo nivel que `following`), no como tabla propia: el
-- progreso nunca se persiste (se deriva contra listen_entry en lectura,
-- igual que artist_journey y Camino), así que perder la fila de list_save
-- (al dejar de guardar) solo pierde la preferencia de tracking, no datos
-- reales.

-- La migración 0027 agregó el CHECK de `kind` sin nombre explícito, así que
-- Postgres lo bautizó con su convención por defecto (`user_list_kind_check`,
-- no `chk_user_list_kind` como en columnas agregadas después). Lo reemplaza
-- con un nombre explícito para que coincida con `schema.ts` de acá en más.
ALTER TABLE user_list
    DROP CONSTRAINT user_list_kind_check,
    ADD CONSTRAINT chk_user_list_kind
        CHECK (kind IN ('standard', 'artist_journey', 'custom_journey'));

ALTER TABLE list_save
    ADD COLUMN tracking BOOLEAN NOT NULL DEFAULT FALSE;

-- Recuperación de "mis trackeos activos" para /me/caminos.
CREATE INDEX idx_list_save_saver_tracking
    ON list_save (saver_id)
    WHERE tracking;

-- Agregado de descubrimiento (/caminos): conteo de trackeo activo por lista.
CREATE INDEX idx_list_save_list_tracking
    ON list_save (list_id)
    WHERE tracking;
