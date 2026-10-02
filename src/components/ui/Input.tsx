"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { PasswordToggle } from "./PasswordToggle";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  // Campo de contraseña con el ojo de mostrar/ocultar; ignora `type`.
  revealable?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, revealable = false, type, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const [revealed, setRevealed] = useState(false);

    const field = (
      <input
        ref={ref}
        id={inputId}
        type={revealable ? (revealed ? "text" : "password") : type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`rounded border bg-ink-surface px-3 py-2 font-body text-paper placeholder:text-paper-muted ${
          revealable ? "w-full pr-12" : ""
        } ${error ? "border-danger" : "border-ink-border"} ${className}`}
        {...props}
      />
    );

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="font-display text-sm text-paper-muted">
          {label}
        </label>
        {revealable ? (
          <div className="relative">
            {field}
            <PasswordToggle
              revealed={revealed}
              onToggle={() => setRevealed((current) => !current)}
              disabled={props.disabled}
            />
          </div>
        ) : (
          field
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
