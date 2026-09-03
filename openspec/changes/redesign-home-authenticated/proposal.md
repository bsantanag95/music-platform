## Why

El estado anónimo de `/[locale]` recibió un rediseño completo en `redesign-frontend`
(hero a sangre, muro de carátulas, carrusel de funcionalidades, riel de lanzamientos,
comentarios populares). El estado con sesión quedó atrás: es un encabezado con
`appName` + `tagline` — texto que un usuario logueado ya no necesita — seguido de los
mismos bloques de descubrimiento, sin una jerarquía pensada para quien vuelve. No hay
nada del propio usuario más allá del preview de feed, y todavía arrastra piezas
pensadas para convencer a un visitante nuevo. Este cambio cierra la estructura y la
jerarquía del Inicio con sesión, igual que `docs/05-features/home.md` cerró la del
anónimo.

## What Changes

- **Se quita del Inicio con sesión** el encabezado `appName` + `tagline` (propuesta de
  valor para quien todavía no entró) y cualquier CTA de registro/login. El carrusel de
  funcionalidades (`HowItWorks`/`FeatureCarousel`) y el hero anónimo (`AnonHero`,
  `HeroCoverWall`, `AnonCta`) siguen siendo exclusivos del estado anónimo.
- **Jerarquía nueva con sesión**, de arriba a abajo:
  1. Saludo breve al usuario (`Hola, {displayName}`) — una línea, sin conteos ni
     métricas de progreso.
  2. **Preview del feed de seguidos** como bloque protagonista (ya existe, sube en la
     página) o, si no sigue a nadie, el nudge de onboarding.
  3. **Tu rastro reciente** (bloque nuevo): tus últimas escuchas, valoraciones y
     comentarios registrados, como recap de presencia. Sin "pendientes de valorar",
     sin conteos, sin rachas — respeta la anti-feature "sin gamificación".
  4. **Retomá una lista** (bloque nuevo): acceso directo a tu lista editada más
     recientemente para seguir agregando ítems. Se oculta si no tenés listas.
  5. Accesos rápidos (`QuickLinks`, ya existe).
  6. Descubrimiento: actividad de la comunidad + listas públicas + comentarios
     populares + riel de lanzamientos (ya existen; se mantienen en layout full-width,
     no compacto).
- **Nudge de onboarding ampliado** (`OnboardingPrompt`): para el usuario con sesión
  sin seguidos, además de "buscar gente" y "explorar listas", invita a registrar tu
  primera escucha. Sigue siendo un nudge en prosa, no un checklist con tildes.
- **Dato nuevo:** `listMyRecentActivity(userId, limit)` en `src/services/home/home.ts`
  — unión de escuchas + ratings + comentarios propios recientes, sin filtro de
  audiencia (es contenido del propio usuario). Reusa los patrones de consulta de
  `listCommunityActivity`.
- **Dato nuevo:** `getMostRecentEditedList(userId)` en `src/services/home/home.ts` —
  la lista propia con actividad más reciente, con un puñado de `coverThumbUrl` de sus
  ítems para el mini-mosaico. Alternativamente, `listMyLists` ordenado por
  `updatedAt`.
- Namespace de mensajes `home` (`messages/{es,en}/home.json`) gana las claves de los
  bloques nuevos y del saludo.
- Sin rutas HTTP nuevas: los bloques se resuelven en el Server Component vía servicios,
  igual que el resto de Inicio.

## Capabilities

### New Capabilities

(ninguna — `home` ya existe como capability)

### Modified Capabilities

- `home`: el requirement "Contenido de Inicio diferenciado por sesión" cambia la
  composición del estado con sesión — quita el hero de propuesta de valor, agrega
  saludo, "tu rastro reciente" y "retomá una lista", sube el feed a bloque
  protagonista y amplía el nudge de onboarding. Los requirements de "Actividad
  reciente de la comunidad" y "Listas públicas recientes" no cambian.

## Impact

- **Código:** `src/app/[locale]/page.tsx` (recomposición del rama `user`),
  `src/components/home/*` (nuevos: `Greeting`, `RecentActivity` o similar,
  `ResumeList`; `OnboardingPrompt` ampliado; posible retiro del encabezado inline),
  `src/services/home/home.ts` (`listMyRecentActivity`, `getMostRecentEditedList`),
  `src/services/home/home.test.ts`.
- **Componentes reusados:** `FeedEntryCard`/`FeedEntryBody`, `CoverThumb`,
  `formatFeedDate`, `targetHref`.
- **API:** ninguna ruta HTTP nueva.
- **Esquema:** ninguno — reusa `listen_entry`, `rating`, `comment`, `user_list`,
  `app_user`.
- **i18n:** `messages/{es,en}/home.json` (claves nuevas). Sin cambios en
  `src/i18n/request.ts` (el namespace ya está registrado).
- **Documentación:** `docs/05-features/home.md` (cerrar la sección del Inicio con
  sesión, hoy centrada en el anónimo).
- **Tests:** `src/app/[locale]/page.test.tsx` (cubrir la rama con sesión: bloques
  presentes/ausentes según follows, actividad propia y listas).
