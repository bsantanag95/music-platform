"use client";

import { useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { completeOnboarding } from "@/lib/api/onboarding";
import type { Audience } from "@/services/social/types";
import { AlbumIdentityPicker, type PickedAlbum } from "./AlbumIdentityPicker";
import { ArtistFollowPicker } from "./ArtistFollowPicker";
import { NowPlayingPicker } from "./NowPlayingPicker";

// Onboarding guiado en tres pasos (openspec: redesign-welcome-flow, sobre
// add-two-door-onboarding): 1 álbumes que te definen (Puerta 1), 2 artistas que
// quieres seguir, 3 qué estás escuchando ahora (Puerta 2). Ningún paso es
// obligatorio. Los tres pasos viven montados y el inactivo se oculta con
// `hidden`: así conservan su estado (resultados, lo registrado o seguido) al ir
// y volver. Lo único que cierra el onboarding es `finish`, que dispara
// `POST /api/me/onboarding` con los álbumes del paso 1 (o vacío) y muestra el
// resumen en lugar de saltar directo a Inicio.
const STEPS = ["album", "artists", "listening"] as const;
const LAST_STEP = STEPS.length - 1;

interface WelcomeFlowProps {
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
}

export function WelcomeFlow({ favoriteAudience, diaryAudience, exploreEnabled, notice }: WelcomeFlowProps) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const progressRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<PickedAlbum[]>([]);
  const [followingCount, setFollowingCount] = useState(0);
  const [listenCount, setListenCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [errored, setErrored] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const countByStep = [picked.length, followingCount, listenCount];
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
      setSummary({ favorites: picked.length, following: followingCount, listens: listenCount });
    } catch {
      setErrored(true);
    } finally {
      setPending(false);
    }
  }

  function goHome() {
    router.push("/");
    router.refresh();
  }

  if (summary) {
    const lines = [
      summary.favorites > 0 && t("summary.favorites", { count: summary.favorites }),
      summary.following > 0 && t("summary.following", { count: summary.following }),
      summary.listens > 0 && t("summary.listens", { count: summary.listens }),
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
        <div className="flex flex-col gap-3">
          <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("summary.next")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" className="min-h-11" onClick={goHome}>
              {t("summary.goHome")}
            </Button>
            {exploreEnabled && (
              <Link href="/explore">
                <Button variant="secondary" className="min-h-11">
                  {t("summary.explore")}
                </Button>
              </Link>
            )}
            <Link href="/users">
              <Button variant="secondary" className="min-h-11">
                {t("summary.findPeople")}
              </Button>
            </Link>
          </div>
        </div>
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
        <ol aria-label={t("steps.nav")} className="grid grid-cols-3 gap-2">
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
        <ArtistFollowPicker onCountChange={setFollowingCount} />
      </div>
      <div hidden={step !== 2}>
        <NowPlayingPicker audience={diaryAudience} onCountChange={setListenCount} />
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
