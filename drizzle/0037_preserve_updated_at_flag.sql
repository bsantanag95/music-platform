-- =====================================================================
-- INDICADOR app.preserve_updated_at - conservar updated_at en un UPDATE
-- =====================================================================

-- Cambio apply-default-audience. user_list.updated_at y collection_entry.updated_at
-- los mantiene un trigger BEFORE UPDATE que pone now() en CUALQUIER UPDATE (regla del
-- proyecto: nunca desde la app). El feed deriva de user_list.updated_at los eventos de
-- "lista actualizada" y el perfil su ultima actividad de ambos: aplicar la audiencia a
-- toda la biblioteca en bloque generaria un evento por lista sin que nadie las haya
-- editado.
--
-- Las dos funciones de trigger se reemplazan para que, si la transaccion tiene
-- app.preserve_updated_at = 'on' (set_config(..., true), local a la transaccion),
-- conserven OLD.updated_at. Sin el indicador se comportan exactamente igual que antes,
-- asi que las ediciones individuales no cambian. No se desactiva ningun trigger.

CREATE OR REPLACE FUNCTION trg_user_list_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.preserve_updated_at', true) = 'on' THEN
        NEW.updated_at = OLD.updated_at;
    ELSE
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_collection_entry_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    IF current_setting('app.preserve_updated_at', true) = 'on' THEN
        NEW.updated_at = OLD.updated_at;
    ELSE
        NEW.updated_at = now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
