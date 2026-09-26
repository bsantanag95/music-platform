"use client";

import { useId, useState } from "react";

// Cinco estrellas con medias estrellas (openspec: rework-album-relation-panel, D3). Es un
// grupo de diez radios nativos (½…5) ocultos detrás de los glifos: la mitad izquierda de
// cada estrella elige x.5 y la derecha x, las flechas mueven de ½ en ½ con el
// comportamiento nativo del grupo, y el lector de pantalla anuncia el valor de cada radio.
// Presentacional: quien lo usa decide qué hacer con `onChange` (el panel guarda al instante).

const STAR_COUNT = 5;

interface StarRatingInputProps {
  /** Valor vigente (½…5) o `null` sin valoración. */
  value: number | null;
  onChange: (value: number) => void;
  /** Rótulo accesible del grupo. */
  legend: string;
  /** Texto accesible de cada opción (p. ej. "3,5 estrellas"). */
  valueLabel: (value: number) => string;
  disabled?: boolean;
}

export function StarRatingInput({ value, onChange, legend, valueLabel, disabled = false }: StarRatingInputProps) {
  const name = useId();
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? value ?? 0;

  return (
    <fieldset
      className="min-w-0 rounded has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-amber"
      disabled={disabled}
    >
      <legend className="sr-only">{legend}</legend>
      <div className="flex" onPointerLeave={() => setPreview(null)}>
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const star = index + 1;
          const fill = shown >= star ? 1 : shown >= star - 0.5 ? 0.5 : 0;
          return (
            <span key={star} className="relative inline-flex h-10 w-8 items-center justify-center">
              <StarGlyph fill={fill} preview={preview !== null} />
              {[star - 0.5, star].map((option, half) => (
                <label
                  key={option}
                  className={`absolute inset-y-0 w-1/2 ${half === 0 ? "left-0" : "right-0"} ${
                    disabled ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onPointerEnter={() => {
                    if (!disabled) setPreview(option);
                  }}
                >
                  <input
                    type="radio"
                    name={name}
                    value={option}
                    checked={value === option}
                    onChange={() => onChange(option)}
                    aria-label={valueLabel(option)}
                    className="sr-only"
                  />
                </label>
              ))}
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}

const STAR_PATH =
  "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.49l-5.87 3.09 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z";

/** Estrella con relleno completo, medio o vacío; la comparten el input y `StarRatingDisplay`. */
export function StarGlyph({
  fill,
  preview = false,
  className = "size-6",
}: {
  fill: 0 | 0.5 | 1;
  preview?: boolean;
  className?: string;
}) {
  // `useId` puede traer caracteres que rompen `url(#…)`; se dejan solo los seguros.
  const clipId = `star-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tone = preview ? "text-amber-hover" : "text-amber";
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`pointer-events-none shrink-0 ${className}`}>
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={24 * fill} height="24" />
        </clipPath>
      </defs>
      <path d={STAR_PATH} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-paper-muted" />
      {fill > 0 && <path d={STAR_PATH} fill="currentColor" clipPath={`url(#${clipId})`} className={tone} />}
    </svg>
  );
}
