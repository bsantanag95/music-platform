-- =====================================================================
-- Migración 0020 — app_user.onboarded_at: onboarding de dos puertas
-- =====================================================================
-- Motivo (openspec: add-two-door-onboarding, Fase 1 de
-- redefine-content-hierarchy): la ruta /welcome presenta un onboarding de
-- dos puertas (identidad = álbumes favoritos; presente = escucha en el
-- diario). Debe mostrarse UNA SOLA VEZ por usuario.
--
-- `onboarded_at` nulo = pendiente. Se fija al completar o saltar el flujo.
-- Mientras sea nulo, la redirección post-alta lleva a /welcome; una vez
-- fijado, /welcome redirige a Inicio.
--
-- Los usuarios que ya existen quedan marcados como onboardeados (su
-- `created_at`): nunca ven /welcome. Solo las altas nuevas lo verán.
-- =====================================================================

ALTER TABLE app_user ADD COLUMN onboarded_at TIMESTAMPTZ;

UPDATE app_user SET onboarded_at = created_at;
