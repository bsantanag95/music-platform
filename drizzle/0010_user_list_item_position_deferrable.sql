-- Migración 0010: la unicidad de posición de user_list_item pasa a
-- DEFERRABLE para permitir el reordenamiento transaccional.
-- Fase 5, cambio add-favorites-and-lists.
--
-- 0009 creó `UNIQUE (list_id, position)` inmediato. reorderListItems reasigna
-- posiciones secuencialmente dentro de una transacción (ej. mover el ítem de
-- la posición 2 a la 1 mientras el de la 1 sigue en su lugar), lo que viola la
-- restricción inmediata y aborta la transacción. Con `DEFERRABLE INITIALLY
-- DEFERRED`, la unicidad se verifica al commit del bloque transaccional, donde
-- el nuevo orden ya es consistente.

ALTER TABLE user_list_item
    DROP CONSTRAINT user_list_item_list_id_position_key;

ALTER TABLE user_list_item
    ADD CONSTRAINT user_list_item_list_id_position_key
    UNIQUE (list_id, position)
    DEFERRABLE INITIALLY DEFERRED;