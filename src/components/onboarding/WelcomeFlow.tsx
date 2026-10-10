"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { completeOnboarding } from "@/lib/api/onboarding";
import { clearSessionState, isArrayOf, useSessionState } from "@/lib/session-state";
import type { Audience } from "@/services/social/types";
import { AlbumIdentityPicker, isPickedAlbum, type PickedAlbum } from "./AlbumIdentityPicker";
import { ArtistFollowPicker } from "./ArtistFollowPicker";
import { NowPlayingPicker } from "./NowPlayingPicker";
import { WantToListenPicker } from "./WantToListenPicker";

// Onboarding guiado en cuatro pasos (openspec: redesign-welcome-flow y
// extend-welcome-steps, sobre add-two-door-onboarding): 1 álbumes que te
// definen (Puerta 1), 2 artistas que quieres seguir, 3 qué estás escuchando
// ahora (Puerta 2), 4 para escuchar después (Pendientes). Ningún paso es
// obligatorio. Los pasos viven montados y el inactivo se oculta con
// `hidden`: así conservan su estado (resultados, lo registrado o seguido) al ir
// y volver. Lo único que cierra el onboarding es `finish`, que dispara
// `POST /api/me/onboarding` con los álbumes del paso 1 (o vacío) y muestra el
// resumen en lugar de saltar directo a Inicio.
const STEPS = ["album", "artists", "listening", "wanted"] as const;
const LAST_STEP = STEPS.length - 1;

const isPickedList = isArrayOf(isPickedAlbum);
const isStep = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= LAST_STEP;

interface WelcomeFlowProps {
  /** Persona que hace el onboarding: separa lo guardado en la pestaña entre cuentas. */
  userId: string;
  /** Audiencia efectiva de un favorito nuevo y de una entrada de diario nueva. */
  favoriteAudience: Audience;
  diaryAudience: Audience;
  /** Explorar está activo (flag de lanzamiento): se ofrece en el resumen. */
  exploreEnabled: boolean;
  /** Aviso de verificación de email (ya renderizado por el servidor). */
  notice?: ReactNode;
}

interface Summary {
  favorites: number;
  following: number;
  listens: number;
  wanted: number;
}

export function WelcomeFlow({ userId, favoriteAudience, diaryAudience, exploreEnabled, notice }: WelcomeFlowProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const progressRef = useRef<HTMLDivElement>(null);
  // Recargar la pestaña no pierde el paso ni lo elegido (sessionStorage, por persona).
  const storagePrefix = `welcome:${userId}:`;
  const [step, setStep] = useSessionState<number>(`${storagePrefix}step`, 0, isStep);
  const [picked, setPicked] = useSessionState<PickedAlbum[]>(`${storagePrefix}albums`, [], isPickedList);
  const [followingCount, setFollowingCount] = useState(0);
  const [listenCount, setListenCount] = useState(0);
  const [wantedCount, setWantedCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [errored, setErrored] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const countByStep = [picked.length, followingCount, listenCount, wantedCount];
  const anythingDone = countByStep.some((n) => n > 0);

  function goTo(next: number) {
    setStep(next);
    // En móvil los botones quedan al pie de un paso largo: el paso nuevo empieza arriba.
    progressRef.current?.scrollIntoView?.({ block: "start" });
  }

  async function finish() {
    setPending(true);
    setErrored(false);
    try {
      await completeOnboarding(picked.map((a) => a.id));
      setSummary({ favorites: picked.length, following: followingCount, listens: listenCount, wanted: wantedCount });
      clearSessionState(storagePrefix);
    } catch {
      setErrored(true);
    } finally {
      setPending(false);
    }
  }

  // Inicio es dinámico (Next 15 no lo cachea en el cliente) y el layout no cambia con el cierre del
  // onboarding: un `router.refresh()` extra pedía la página dos veces.
  function goHome() {
    router.push("/");
  }

  if (summary) {
    const lines = [
      summary.favorites > 0 && t("summary.favorites", { count: summary.favorites }),
      summary.following > 0 && t("summary.following", { count: summary.following }),
      summary.listens > 0 && t("summary.listens", { count: summary.listens }),
      summary.wanted > 0 && t("summary.wanted", { count: summary.wanted }),
    ].filter(Boolean);

    return (
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-3xl text-paper">{t("summary.heading")}</h1>
          <p className="font-body text-paper-muted">{lines.length > 0 ? t("summary.intro") : t("summary.empty")}</p>
        </header>
        {lines.length > 0 && (
          <ul className="flex flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-6">
            {lines.map((line) => (
              <li key={String(line)} className="flex items-center gap-3 font-body text-paper">
                <span aria-hidden="true" className="font-data text-sm text-petrol-hover">
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        )}
        {/* Una sola acción principal; lo demás son salidas secundarias en lista, no cinco botones iguales. */}
        <div className="flex flex-col gap-3">
          <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("summary.next")}</p>
          <Button type="button" className="min-h-11 w-full sm:w-auto sm:self-start" onClick={goHome}>
            {t("summary.goHome")}
          </Button>
        </div>
        <nav aria-label={t("summary.also")} className="flex flex-col gap-3">
          <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("summary.also")}</p>
          <ul className="flex flex-col divide-y divide-ink-border overflow-hidden rounded-lg border border-ink-border bg-ink-surface">
            {/* Lo que aún no hizo (géneros de su identidad musical, valorar un disco) va primero. */}
            <SummaryLink href="/me/settings/profile">{t("summary.suggestGenres")}</SummaryLink>
            {summary.listens === 0 && <SummaryLink href="/search?type=album">{t("summary.suggestRate")}</SummaryLink>}
            {exploreEnabled && <SummaryLink href="/explore">{t("summary.explore")}</SummaryLink>}
            <SummaryLink href="/users">{t("summary.findPeople")}</SummaryLink>
          </ul>
        </nav>
      </div>
    );
  }

  const stepHasContent = (countByStep[step] ?? 0) > 0;
  const isLast = step === LAST_STEP;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-paper">{t("heading")}</h1>
        <p className="font-body text-paper-muted">{t("intro")}</p>
      </header>

      {notice}

      <div ref={progressRef} className="flex scroll-mt-4 flex-col gap-2">
        <p aria-live="polite" className="font-data text-xs text-paper-muted">
          {t("steps.progress", { current: step + 1, total: STEPS.length })}
        </p>
        <ol aria-label={t("steps.nav")} className="grid grid-cols-4 gap-2">
          {STEPS.map((name, index) => (
            <li
              key={name}
              aria-current={index === step ? "step" : undefined}
              className={`border-t-2 pt-1.5 font-data text-xs ${
                index === step
                  ? "border-amber text-paper"
                  : index < step
                    ? "border-petrol-hover text-paper-muted"
                    : "border-ink-border text-paper-muted"
              }`}
            >
              {t(`steps.${name}`)}
            </li>
          ))}
        </ol>
      </div>

      <div hidden={step !== 0}>
        <AlbumIdentityPicker picked={picked} onChange={setPicked} audience={favoriteAudience} />
      </div>
      <div hidden={step !== 1}>
        <ArtistFollowPicker onCountChange={setFollowingCount} storageKey={`${storagePrefix}artists`} />
      </div>
      <div hidden={step !== 2}>
        <NowPlayingPicker audience={diaryAudience} onCountChange={setListenCount} storageKey={`${storagePrefix}listens`} />
      </div>
      <div hidden={step !== 3}>
        <WantToListenPicker onCountChange={setWantedCount} storageKey={`${storagePrefix}wanted`} />
      </div>

      {errored && (
        <p role="alert" className="font-data text-sm text-danger">
          {t("error")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {step > 0 && (
          <Button type="button" variant="secondary" className="min-h-11" disabled={pending} onClick={() => goTo(step - 1)}>
            {t("nav.back")}
          </Button>
        )}
        {isLast ? (
          <Button type="button" className="min-h-11" disabled={pending} onClick={() => void finish()}>
            {pending ? t("finish.saving") : t("nav.finish")}
          </Button>
        ) : (
          <Button
            type="button"
            variant={stepHasContent ? "primary" : "secondary"}
            className="min-h-11"
            disabled={pending}
            onClick={() => goTo(step + 1)}
          >
            {stepHasContent ? t("nav.next") : t("nav.skipStep")}
          </Button>
        )}
        {!isLast && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void finish()}
            className="min-h-11 px-2 font-data text-sm text-paper-muted underline hover:text-paper disabled:opacity-50"
          >
            {pending ? t("finish.saving") : anythingDone ? t("finish.now") : t("finish.skip")}
          </button>
        )}
      </div>
    </div>
  );
}

// Salida secundaria del resumen: fila de lista con flecha, para que no compita con «Ir a Inicio».
function SummaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-11 items-center justify-between gap-3 px-4 py-3 font-body text-paper transition-colors hover:bg-ink hover:text-amber"
      >
        {children}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-4 shrink-0 text-paper-muted transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-amber"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </li>
  );
}
