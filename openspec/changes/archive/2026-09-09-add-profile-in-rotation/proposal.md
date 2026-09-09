## Why

El perfil ya muestra la **identidad cultural estable** del usuario (álbumes favoritos,
destacados, himno) pero no muestra **cómo vive la música ahora**. La dirección
`redefine-content-hierarchy` (Fase 1, orden vertical Q7) define una sección dinámica **"En
rotación"** derivada del diario: lo que la persona ha estado escuchando últimamente. Es la
contraparte viva de los álbumes favoritos y cierra la lectura "quién es / qué está
sonando" del perfil.

## What Changes

- Nueva sección de perfil **"En rotación"**: canciones (señal primaria) y álbumes
  (agrupación contextual) que aparecen con frecuencia en el diario del dueño en los
  últimos **30 días**, ordenados por un score de recencia + frecuencia.
- **Derivación solo desde el diario** (`listen_entry`): nunca desde reacciones, favoritos
  ni valoraciones. Una reacción dice "me gusta", no "lo estoy escuchando ahora".
- **Arquitectura `señales → score → estado`**: el cálculo se modela como un puntaje sobre
  eventos de escucha crudos (`timestamp + entidad + tipo`), no como un umbral
  hard-codeado, para poder ajustar los umbrales sin migrar datos. Cálculo bajo demanda,
  sin tabla materializada (mismo patrón que `taste-fingerprint`).
- **Respeta la audiencia del diario**: un visitante solo alimenta el cálculo con las
  entradas que tiene permitido ver; la sección puede quedar vacía para él y entonces no se
  renderiza.
- **Tono cultural, no gamificación**: sin contadores de veces ("🔥 5 escuchas"), sin
  mostrar el algoritmo, sin rachas.
- `GET /api/users/[username]/in-rotation` para paridad con `fingerprint` (mismo filtrado
  por acceso).
- Se inserta en el perfil **después de los destacados** (`PinnedSection`) y **antes de la
  huella de gusto**, sin reordenar el resto (mismo criterio de mínima superficie que
  `redesign-profile-album-identity`).

## Capabilities

### New Capabilities

- `profile-in-rotation`: la sección "En rotación" del perfil — qué la alimenta (solo
  diario), la ventana y los pesos de recencia, la heurística experimental de álbum en
  rotación, el filtrado por audiencia, la presentación (canciones primarias, álbumes
  contextuales, sin métricas visibles) y su lugar en la composición del perfil.

### Modified Capabilities

- `social-profiles`: la composición del perfil por nivel de acceso incluye ahora la
  sección "En rotación" en los niveles autorizado y dueño (junto a huella, álbumes
  favoritos, destacados, himno y estantes).

## Impact

- **Nuevo servicio** `src/services/profiles/in-rotation.ts` (cálculo `señales → score →
  estado`, filtrado por audiencia, `cache()` por request).
- **Nuevo componente** `src/components/profiles/InRotation.tsx` (display, Server Component,
  colapsa si vacío).
- **Nuevo endpoint** `src/app/api/users/[username]/in-rotation/route.ts` + Zod schema.
- **Modificado** `src/app/[locale]/users/[username]/sections.tsx` y `page.tsx` (nueva
  `InRotationSection`, insertada entre `PinnedSection` y `FingerprintSection`).
- **i18n** `messages/{es,en}/users.json` (bloque `inRotation`).
- **Docs** `docs/05-features/user-profile.md`, `docs/04-api/contracts.md`.
- Sin migración: `listen_entry` ya tiene todo lo necesario (`created_at`, objetivo
  polimórfico, `audience`). La resolución canción→álbum reutiliza `track → release →
  release_group`.
- Sin cambios en el diario, los favoritos, la huella ni el feed.
