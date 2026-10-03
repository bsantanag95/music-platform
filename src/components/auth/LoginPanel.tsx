"use client";

import { useState, type ReactNode } from "react";
import { AuthForm } from "./AuthForm";
import { SocialSignIn } from "./SocialSignIn";

// Acceso al login: el botón de Google y el formulario comparten la casilla
// "Mantener la sesión iniciada". Este componente solo guarda esa elección; el
// flujo OAuth sigue entero en el servidor (el botón solo compone la URL de inicio).
export function LoginPanel({
  locale,
  googleLabel,
  separator,
  passwordAside,
}: {
  locale: string;
  googleLabel: string;
  separator: string;
  passwordAside?: ReactNode;
}) {
  const [remember, setRemember] = useState(true);
  return (
    <>
      <SocialSignIn locale={locale} label={googleLabel} separator={separator} remember={remember} />
      <AuthForm
        mode="login"
        passwordAside={passwordAside}
        remember={remember}
        onRememberChange={setRemember}
      />
    </>
  );
}
